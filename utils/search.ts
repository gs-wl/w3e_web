import logger from '../config/logger';
import { performance } from '../config/monitoring';
import { CryptoUtils } from './crypto';
import ValidationUtils from './validation';

// Search interfaces
export interface SearchConfig {
  enableFuzzySearch: boolean;
  enableHighlighting: boolean;
  enableFaceting: boolean;
  enableAutoComplete: boolean;
  maxResults: number;
  defaultPageSize: number;
  cacheResults: boolean;
  cacheTTL: number;
}

export interface SearchQuery {
  query: string;
  filters?: SearchFilter[];
  sort?: SearchSort[];
  pagination?: SearchPagination;
  facets?: string[];
  highlight?: SearchHighlight;
  options?: SearchOptions;
}

export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: any;
  boost?: number;
}

export interface SearchSort {
  field: string;
  direction: 'asc' | 'desc';
  boost?: number;
}

export interface SearchPagination {
  page: number;
  size: number;
  offset?: number;
}

export interface SearchHighlight {
  fields: string[];
  preTag?: string;
  postTag?: string;
  maxLength?: number;
}

export interface SearchOptions {
  fuzzyDistance?: number;
  boostFields?: Record<string, number>;
  minimumShouldMatch?: number;
  analyzer?: string;
  includeScore?: boolean;
  timeout?: number;
}

export interface SearchResult<T = any> {
  items: SearchResultItem<T>[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  facets?: SearchFacet[];
  suggestions?: string[];
  executionTime: number;
  query: string;
}

export interface SearchResultItem<T = any> {
  id: string;
  data: T;
  score: number;
  highlights?: Record<string, string[]>;
  explanation?: string;
}

export interface SearchFacet {
  field: string;
  values: SearchFacetValue[];
}

export interface SearchFacetValue {
  value: any;
  count: number;
  selected?: boolean;
}

export interface SearchIndex {
  name: string;
  fields: SearchField[];
  documents: Map<string, any>;
  invertedIndex: Map<string, Set<string>>;
  fieldIndex: Map<string, Map<string, Set<string>>>;
  stats: SearchIndexStats;
}

export interface SearchField {
  name: string;
  type: FieldType;
  searchable: boolean;
  filterable: boolean;
  sortable: boolean;
  facetable: boolean;
  boost: number;
  analyzer?: string;
}

export interface SearchIndexStats {
  documentCount: number;
  fieldCount: number;
  indexSize: number;
  lastUpdated: Date;
  searchCount: number;
  averageSearchTime: number;
}

export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
export type FieldType = 'text' | 'keyword' | 'number' | 'date' | 'boolean' | 'geo' | 'object' | 'array';

// Search error class
export class SearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public query?: string
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

// Text analyzer for search processing
export class TextAnalyzer {
  private stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
    'had', 'what', 'said', 'each', 'which', 'their', 'time', 'if'
  ]);

  /**
   * Analyze text and return tokens
   */
  analyze(text: string, analyzer = 'standard'): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    switch (analyzer) {
      case 'standard':
        return this.standardAnalyzer(text);
      case 'keyword':
        return [text.toLowerCase().trim()];
      case 'simple':
        return this.simpleAnalyzer(text);
      case 'whitespace':
        return text.split(/\s+/).filter(token => token.length > 0);
      default:
        return this.standardAnalyzer(text);
    }
  }

  /**
   * Standard analyzer: lowercase, remove punctuation, remove stop words
   */
  private standardAnalyzer(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 1 && !this.stopWords.has(token));
  }

  /**
   * Simple analyzer: lowercase, split on non-letters
   */
  private simpleAnalyzer(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(token => token.length > 0);
  }

  /**
   * Calculate fuzzy distance between two strings
   */
  fuzzyDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Generate n-grams from text
   */
  generateNGrams(text: string, n = 2): string[] {
    const tokens = this.analyze(text);
    const ngrams: string[] = [];

    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }

    return ngrams;
  }
}

// Search engine implementation
export class SearchEngine {
  private config: Required<SearchConfig>;
  private indexes = new Map<string, SearchIndex>();
  private analyzer = new TextAnalyzer();
  private cache = new Map<string, { result: SearchResult; timestamp: number }>();

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = {
      enableFuzzySearch: true,
      enableHighlighting: true,
      enableFaceting: true,
      enableAutoComplete: true,
      maxResults: 1000,
      defaultPageSize: 20,
      cacheResults: true,
      cacheTTL: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Create search index
   */
  createIndex(name: string, fields: SearchField[]): SearchIndex {
    const index: SearchIndex = {
      name,
      fields,
      documents: new Map(),
      invertedIndex: new Map(),
      fieldIndex: new Map(),
      stats: {
        documentCount: 0,
        fieldCount: fields.length,
        indexSize: 0,
        lastUpdated: new Date(),
        searchCount: 0,
        averageSearchTime: 0,
      },
    };

    // Initialize field indexes
    for (const field of fields) {
      index.fieldIndex.set(field.name, new Map());
    }

    this.indexes.set(name, index);

    logger.info('Search index created', {
      indexName: name,
      fieldCount: fields.length,
    });

    return index;
  }

  /**
   * Add document to index
   */
  addDocument(indexName: string, id: string, document: any): void {
    const timer = performance.startTimer('search_index_document');
    
    try {
      const index = this.indexes.get(indexName);
      if (!index) {
        throw new SearchError(`Index not found: ${indexName}`, 'INDEX_NOT_FOUND');
      }

      // Store document
      index.documents.set(id, document);

      // Index document fields
      for (const field of index.fields) {
        const value = this.getFieldValue(document, field.name);
        if (value !== undefined && value !== null) {
          this.indexField(index, field, id, value);
        }
      }

      // Update stats
      index.stats.documentCount++;
      index.stats.lastUpdated = new Date();
      index.stats.indexSize = this.calculateIndexSize(index);

      // Clear cache
      if (this.config.cacheResults) {
        this.clearCache();
      }

      logger.debug('Document indexed', {
        indexName,
        documentId: id,
        documentCount: index.stats.documentCount,
      });
    } catch (error) {
      logger.error('Failed to index document', { error, indexName, id });
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Remove document from index
   */
  removeDocument(indexName: string, id: string): boolean {
    try {
      const index = this.indexes.get(indexName);
      if (!index) {
        return false;
      }

      const document = index.documents.get(id);
      if (!document) {
        return false;
      }

      // Remove from document store
      index.documents.delete(id);

      // Remove from inverted index
      for (const [term, docIds] of index.invertedIndex.entries()) {
        docIds.delete(id);
        if (docIds.size === 0) {
          index.invertedIndex.delete(term);
        }
      }

      // Remove from field indexes
      for (const [fieldName, fieldIndex] of index.fieldIndex.entries()) {
        for (const [value, docIds] of fieldIndex.entries()) {
          docIds.delete(id);
          if (docIds.size === 0) {
            fieldIndex.delete(value);
          }
        }
      }

      // Update stats
      index.stats.documentCount--;
      index.stats.lastUpdated = new Date();
      index.stats.indexSize = this.calculateIndexSize(index);

      // Clear cache
      if (this.config.cacheResults) {
        this.clearCache();
      }

      logger.debug('Document removed from index', {
        indexName,
        documentId: id,
        documentCount: index.stats.documentCount,
      });

      return true;
    } catch (error) {
      logger.error('Failed to remove document from index', { error, indexName, id });
      return false;
    }
  }

  /**
   * Search documents
   */
  async search<T = any>(indexName: string, query: SearchQuery): Promise<SearchResult<T>> {
    const timer = performance.startTimer('search_query');
    
    try {
      const index = this.indexes.get(indexName);
      if (!index) {
        throw new SearchError(`Index not found: ${indexName}`, 'INDEX_NOT_FOUND', query.query);
      }

      // Check cache
      const cacheKey = this.getCacheKey(indexName, query);
      if (this.config.cacheResults) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return cached as SearchResult<T>;
        }
      }

      // Execute search
      const startTime = Date.now();
      const result = await this.executeSearch<T>(index, query);
      const executionTime = Date.now() - startTime;

      result.executionTime = executionTime;
      result.query = query.query;

      // Update stats
      index.stats.searchCount++;
      index.stats.averageSearchTime = 
        (index.stats.averageSearchTime * (index.stats.searchCount - 1) + executionTime) / 
        index.stats.searchCount;

      // Cache result
      if (this.config.cacheResults) {
        this.setCache(cacheKey, result);
      }

      logger.debug('Search completed', {
        indexName,
        query: query.query,
        resultCount: result.items.length,
        totalResults: result.total,
        executionTime,
      });

      return result;
    } catch (error) {
      logger.error('Search failed', { error, indexName, query });
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(indexName: string, query: string, limit = 10): Promise<string[]> {
    try {
      const index = this.indexes.get(indexName);
      if (!index) {
        return [];
      }

      const queryTokens = this.analyzer.analyze(query.toLowerCase());
      if (queryTokens.length === 0) {
        return [];
      }

      const suggestions = new Set<string>();
      const lastToken = queryTokens[queryTokens.length - 1];

      // Find terms that start with the last token
      for (const term of index.invertedIndex.keys()) {
        if (term.startsWith(lastToken) && term !== lastToken) {
          const suggestion = queryTokens.slice(0, -1).concat(term).join(' ');
          suggestions.add(suggestion);
          
          if (suggestions.size >= limit) {
            break;
          }
        }
      }

      // Add fuzzy matches if enabled
      if (this.config.enableFuzzySearch && suggestions.size < limit) {
        for (const term of index.invertedIndex.keys()) {
          if (suggestions.size >= limit) break;
          
          const distance = this.analyzer.fuzzyDistance(lastToken, term);
          if (distance <= 2 && distance > 0) {
            const suggestion = queryTokens.slice(0, -1).concat(term).join(' ');
            suggestions.add(suggestion);
          }
        }
      }

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      logger.error('Failed to get suggestions', { error, indexName, query });
      return [];
    }
  }

  /**
   * Get index statistics
   */
  getIndexStats(indexName: string): SearchIndexStats | undefined {
    const index = this.indexes.get(indexName);
    return index ? { ...index.stats } : undefined;
  }

  /**
   * Clear index
   */
  clearIndex(indexName: string): boolean {
    const index = this.indexes.get(indexName);
    if (!index) {
      return false;
    }

    index.documents.clear();
    index.invertedIndex.clear();
    
    for (const fieldIndex of index.fieldIndex.values()) {
      fieldIndex.clear();
    }

    index.stats.documentCount = 0;
    index.stats.indexSize = 0;
    index.stats.lastUpdated = new Date();

    // Clear cache
    if (this.config.cacheResults) {
      this.clearCache();
    }

    logger.info('Index cleared', { indexName });
    return true;
  }

  /**
   * Delete index
   */
  deleteIndex(indexName: string): boolean {
    const deleted = this.indexes.delete(indexName);
    
    if (deleted) {
      // Clear cache
      if (this.config.cacheResults) {
        this.clearCache();
      }
      
      logger.info('Index deleted', { indexName });
    }
    
    return deleted;
  }

  /**
   * Execute search query
   */
  private async executeSearch<T>(index: SearchIndex, query: SearchQuery): Promise<SearchResult<T>> {
    // Find matching documents
    const matchingDocs = this.findMatchingDocuments(index, query);
    
    // Apply filters
    const filteredDocs = this.applyFilters(index, matchingDocs, query.filters || []);
    
    // Calculate scores and sort
    const scoredDocs = this.calculateScores(index, filteredDocs, query);
    const sortedDocs = this.sortDocuments(scoredDocs, query.sort || []);
    
    // Apply pagination
    const pagination = query.pagination || { page: 1, size: this.config.defaultPageSize };
    const paginatedDocs = this.applyPagination(sortedDocs, pagination);
    
    // Generate facets
    const facets = this.config.enableFaceting && query.facets ? 
      this.generateFacets(index, filteredDocs, query.facets) : [];
    
    // Generate highlights
    const items = paginatedDocs.map(doc => ({
      id: doc.id,
      data: doc.data,
      score: doc.score,
      highlights: this.config.enableHighlighting && query.highlight ? 
        this.generateHighlights(doc.data, query.query, query.highlight) : undefined,
    }));

    return {
      items,
      total: sortedDocs.length,
      page: pagination.page,
      size: pagination.size,
      totalPages: Math.ceil(sortedDocs.length / pagination.size),
      facets,
      executionTime: 0, // Will be set by caller
      query: query.query,
    };
  }

  /**
   * Find documents matching the query
   */
  private findMatchingDocuments(index: SearchIndex, query: SearchQuery): Array<{ id: string; data: any; score: number }> {
    if (!query.query || query.query.trim() === '') {
      // Return all documents if no query
      return Array.from(index.documents.entries()).map(([id, data]) => ({
        id,
        data,
        score: 1,
      }));
    }

    const queryTokens = this.analyzer.analyze(query.query);
    const matchingDocs = new Map<string, { id: string; data: any; score: number }>();

    // Find exact matches
    for (const token of queryTokens) {
      const docIds = index.invertedIndex.get(token);
      if (docIds) {
        for (const docId of docIds) {
          const data = index.documents.get(docId);
          if (data) {
            const existing = matchingDocs.get(docId);
            const score = existing ? existing.score + 1 : 1;
            matchingDocs.set(docId, { id: docId, data, score });
          }
        }
      }
    }

    // Add fuzzy matches if enabled
    if (this.config.enableFuzzySearch && matchingDocs.size < this.config.maxResults) {
      for (const token of queryTokens) {
        for (const [term, docIds] of index.invertedIndex.entries()) {
          const distance = this.analyzer.fuzzyDistance(token, term);
          if (distance <= 2 && distance > 0) {
            for (const docId of docIds) {
              if (!matchingDocs.has(docId)) {
                const data = index.documents.get(docId);
                if (data) {
                  matchingDocs.set(docId, { 
                    id: docId, 
                    data, 
                    score: 1 / (distance + 1) // Lower score for fuzzy matches
                  });
                }
              }
            }
          }
        }
      }
    }

    return Array.from(matchingDocs.values());
  }

  /**
   * Apply filters to documents
   */
  private applyFilters(
    index: SearchIndex,
    documents: Array<{ id: string; data: any; score: number }>,
    filters: SearchFilter[]
  ): Array<{ id: string; data: any; score: number }> {
    if (filters.length === 0) {
      return documents;
    }

    return documents.filter(doc => {
      return filters.every(filter => this.applyFilter(doc.data, filter));
    });
  }

  /**
   * Apply single filter
   */
  private applyFilter(document: any, filter: SearchFilter): boolean {
    const value = this.getFieldValue(document, filter.field);
    
    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'ne':
        return value !== filter.value;
      case 'gt':
        return value > filter.value;
      case 'gte':
        return value >= filter.value;
      case 'lt':
        return value < filter.value;
      case 'lte':
        return value <= filter.value;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'nin':
        return Array.isArray(filter.value) && !filter.value.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(filter.value);
      case 'startsWith':
        return typeof value === 'string' && value.startsWith(filter.value);
      case 'endsWith':
        return typeof value === 'string' && value.endsWith(filter.value);
      case 'regex':
        return typeof value === 'string' && new RegExp(filter.value).test(value);
      default:
        return true;
    }
  }

  /**
   * Calculate document scores
   */
  private calculateScores(
    index: SearchIndex,
    documents: Array<{ id: string; data: any; score: number }>,
    query: SearchQuery
  ): Array<{ id: string; data: any; score: number }> {
    const queryTokens = this.analyzer.analyze(query.query);
    
    return documents.map(doc => {
      let score = doc.score;
      
      // Apply field boosts
      if (query.options?.boostFields) {
        for (const [fieldName, boost] of Object.entries(query.options.boostFields)) {
          const fieldValue = this.getFieldValue(doc.data, fieldName);
          if (fieldValue && typeof fieldValue === 'string') {
            const fieldTokens = this.analyzer.analyze(fieldValue);
            const matches = queryTokens.filter(token => fieldTokens.includes(token));
            score += matches.length * boost;
          }
        }
      }
      
      return { ...doc, score };
    });
  }

  /**
   * Sort documents
   */
  private sortDocuments(
    documents: Array<{ id: string; data: any; score: number }>,
    sorts: SearchSort[]
  ): Array<{ id: string; data: any; score: number }> {
    if (sorts.length === 0) {
      // Default sort by score descending
      return documents.sort((a, b) => b.score - a.score);
    }

    return documents.sort((a, b) => {
      for (const sort of sorts) {
        const aValue = this.getFieldValue(a.data, sort.field);
        const bValue = this.getFieldValue(b.data, sort.field);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        if (sort.direction === 'desc') {
          comparison *= -1;
        }
        
        if (comparison !== 0) {
          return comparison;
        }
      }
      
      // Fallback to score
      return b.score - a.score;
    });
  }

  /**
   * Apply pagination
   */
  private applyPagination(
    documents: Array<{ id: string; data: any; score: number }>,
    pagination: SearchPagination
  ): Array<{ id: string; data: any; score: number }> {
    const offset = pagination.offset || (pagination.page - 1) * pagination.size;
    return documents.slice(offset, offset + pagination.size);
  }

  /**
   * Generate facets
   */
  private generateFacets(
    index: SearchIndex,
    documents: Array<{ id: string; data: any; score: number }>,
    facetFields: string[]
  ): SearchFacet[] {
    const facets: SearchFacet[] = [];
    
    for (const fieldName of facetFields) {
      const field = index.fields.find(f => f.name === fieldName);
      if (!field || !field.facetable) {
        continue;
      }
      
      const valueCounts = new Map<any, number>();
      
      for (const doc of documents) {
        const value = this.getFieldValue(doc.data, fieldName);
        if (value !== undefined && value !== null) {
          const count = valueCounts.get(value) || 0;
          valueCounts.set(value, count + 1);
        }
      }
      
      const values: SearchFacetValue[] = Array.from(valueCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
      
      facets.push({ field: fieldName, values });
    }
    
    return facets;
  }

  /**
   * Generate highlights
   */
  private generateHighlights(
    document: any,
    query: string,
    highlight: SearchHighlight
  ): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    const queryTokens = this.analyzer.analyze(query);
    const preTag = highlight.preTag || '<mark>';
    const postTag = highlight.postTag || '</mark>';
    const maxLength = highlight.maxLength || 200;
    
    for (const fieldName of highlight.fields) {
      const fieldValue = this.getFieldValue(document, fieldName);
      if (fieldValue && typeof fieldValue === 'string') {
        const fieldHighlights: string[] = [];
        
        for (const token of queryTokens) {
          const regex = new RegExp(`\\b${token}\\b`, 'gi');
          const matches = fieldValue.match(regex);
          
          if (matches) {
            // Find context around matches
            let lastIndex = 0;
            fieldValue.replace(regex, (match, index) => {
              const start = Math.max(0, index - 50);
              const end = Math.min(fieldValue.length, index + match.length + 50);
              let snippet = fieldValue.substring(start, end);
              
              // Highlight the match
              snippet = snippet.replace(regex, `${preTag}$&${postTag}`);
              
              if (snippet.length > maxLength) {
                snippet = snippet.substring(0, maxLength) + '...';
              }
              
              fieldHighlights.push(snippet);
              lastIndex = index + match.length;
              return match;
            });
          }
        }
        
        if (fieldHighlights.length > 0) {
          highlights[fieldName] = fieldHighlights;
        }
      }
    }
    
    return highlights;
  }

  /**
   * Index field value
   */
  private indexField(index: SearchIndex, field: SearchField, docId: string, value: any): void {
    // Add to field index for filtering/faceting
    if (field.filterable || field.facetable) {
      const fieldIndex = index.fieldIndex.get(field.name)!;
      const key = String(value);
      
      if (!fieldIndex.has(key)) {
        fieldIndex.set(key, new Set());
      }
      fieldIndex.get(key)!.add(docId);
    }
    
    // Add to inverted index for searching
    if (field.searchable && typeof value === 'string') {
      const tokens = this.analyzer.analyze(value, field.analyzer);
      
      for (const token of tokens) {
        if (!index.invertedIndex.has(token)) {
          index.invertedIndex.set(token, new Set());
        }
        index.invertedIndex.get(token)!.add(docId);
      }
    }
  }

  /**
   * Get field value from document
   */
  private getFieldValue(document: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value = document;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Calculate index size
   */
  private calculateIndexSize(index: SearchIndex): number {
    let size = 0;
    size += index.documents.size * 100; // Rough estimate
    size += index.invertedIndex.size * 50;
    
    for (const fieldIndex of index.fieldIndex.values()) {
      size += fieldIndex.size * 30;
    }
    
    return size;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(indexName: string, query: SearchQuery): string {
    const queryStr = JSON.stringify({
      indexName,
      query: query.query,
      filters: query.filters,
      sort: query.sort,
      pagination: query.pagination,
      facets: query.facets,
      highlight: query.highlight,
      options: query.options,
    });
    
    return CryptoUtils.hash(queryStr);
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): SearchResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.result;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, result: SearchResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
    
    // Clean old cache entries
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [cacheKey, cached] of this.cache.entries()) {
        if (now - cached.timestamp > this.config.cacheTTL) {
          this.cache.delete(cacheKey);
        }
      }
    }
  }

  /**
   * Clear cache
   */
  private clearCache(): void {
    this.cache.clear();
  }
}

// Search utilities
export class SearchUtils {
  /**
   * Create text field
   */
  static createTextField(
    name: string,
    options: Partial<SearchField> = {}
  ): SearchField {
    return {
      name,
      type: 'text',
      searchable: true,
      filterable: false,
      sortable: false,
      facetable: false,
      boost: 1,
      analyzer: 'standard',
      ...options,
    };
  }

  /**
   * Create keyword field
   */
  static createKeywordField(
    name: string,
    options: Partial<SearchField> = {}
  ): SearchField {
    return {
      name,
      type: 'keyword',
      searchable: false,
      filterable: true,
      sortable: true,
      facetable: true,
      boost: 1,
      analyzer: 'keyword',
      ...options,
    };
  }

  /**
   * Create number field
   */
  static createNumberField(
    name: string,
    options: Partial<SearchField> = {}
  ): SearchField {
    return {
      name,
      type: 'number',
      searchable: false,
      filterable: true,
      sortable: true,
      facetable: true,
      boost: 1,
      ...options,
    };
  }

  /**
   * Create date field
   */
  static createDateField(
    name: string,
    options: Partial<SearchField> = {}
  ): SearchField {
    return {
      name,
      type: 'date',
      searchable: false,
      filterable: true,
      sortable: true,
      facetable: false,
      boost: 1,
      ...options,
    };
  }

  /**
   * Build search query
   */
  static buildQuery(
    query: string,
    options: Partial<SearchQuery> = {}
  ): SearchQuery {
    return {
      query,
      filters: [],
      sort: [],
      pagination: { page: 1, size: 20 },
      ...options,
    };
  }

  /**
   * Add filter to query
   */
  static addFilter(
    query: SearchQuery,
    field: string,
    operator: FilterOperator,
    value: any
  ): SearchQuery {
    const filter: SearchFilter = { field, operator, value };
    return {
      ...query,
      filters: [...(query.filters || []), filter],
    };
  }

  /**
   * Add sort to query
   */
  static addSort(
    query: SearchQuery,
    field: string,
    direction: 'asc' | 'desc' = 'asc'
  ): SearchQuery {
    const sort: SearchSort = { field, direction };
    return {
      ...query,
      sort: [...(query.sort || []), sort],
    };
  }

  /**
   * Set pagination
   */
  static setPagination(
    query: SearchQuery,
    page: number,
    size: number
  ): SearchQuery {
    return {
      ...query,
      pagination: { page, size },
    };
  }

  /**
   * Enable highlighting
   */
  static enableHighlighting(
    query: SearchQuery,
    fields: string[],
    options: Partial<SearchHighlight> = {}
  ): SearchQuery {
    return {
      ...query,
      highlight: {
        fields,
        preTag: '<mark>',
        postTag: '</mark>',
        maxLength: 200,
        ...options,
      },
    };
  }

  /**
   * Validate search query
   */
  static validateQuery(query: SearchQuery): string[] {
    const errors: string[] = [];

    if (!query.query || typeof query.query !== 'string') {
      errors.push('Query must be a non-empty string');
    }

    if (query.pagination) {
      if (query.pagination.page < 1) {
        errors.push('Page must be greater than 0');
      }
      if (query.pagination.size < 1 || query.pagination.size > 1000) {
        errors.push('Page size must be between 1 and 1000');
      }
    }

    if (query.filters) {
      for (const filter of query.filters) {
        if (!filter.field || !filter.operator) {
          errors.push('Filter must have field and operator');
        }
      }
    }

    return errors;
  }
}

// Default search engine instance
export const searchEngine = new SearchEngine({
  enableFuzzySearch: true,
  enableHighlighting: true,
  enableFaceting: true,
  enableAutoComplete: true,
  maxResults: 1000,
  defaultPageSize: 20,
  cacheResults: true,
  cacheTTL: 300000,
});

export default SearchEngine;