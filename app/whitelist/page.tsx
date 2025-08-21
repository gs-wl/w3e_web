'use client'

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Mail, MessageSquare, User, Wallet, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function WhitelistPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    participateAirdrops: false,
    joinCompetitions: false,
    bugBountyInterest: false,
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/submit-whitelist-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          nickname: formData.nickname,
          email: formData.email,
          participateAirdrops: formData.participateAirdrops,
          joinCompetitions: formData.joinCompetitions,
          bugBountyInterest: formData.bugBountyInterest
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Whitelist application submitted successfully:', result);
        setIsSubmitted(true);
      } else {
        console.error('❌ Failed to submit application:', result.error);
        alert(`Failed to submit application: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error submitting application:', error);
      alert('An error occurred while submitting your application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-teal-50" style={{ background: 'linear-gradient(to bottom, #f0fdfa, #ffffff, #f0fdfa)' }}>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <CheckCircle className="h-20 w-20 mx-auto mb-4" style={{ color: '#41a290' }} />
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Application Submitted Successfully!
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Thank you for your interest in W3-Energy. You&apos;re now first in line for the future of energy!
              </p>
            </div>

            <Card className="shadow-lg" style={{ borderColor: '#41a290' }}>
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2" style={{ color: '#13493f' }}>
                    <Wallet className="h-5 w-5" />
                    <span className="font-mono text-sm">{address}</span>
                  </div>

                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#f0fdfa' }}>
                    <h3 className="font-semibold mb-2" style={{ color: '#13493f' }}>What happens next?</h3>
                    <ul className="text-sm space-y-2" style={{ color: '#13493f' }}>
                      <li>• Our team will review your application within 48 hours</li>
                      <li>• You&apos;ll receive an email notification about your status</li>
                      <li>• Approved wallets will gain immediate access to the platform</li>
                      <li>• You can check your status anytime by connecting your wallet</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t" style={{ borderColor: '#41a290' }}>
                  <Button
                    onClick={() => window.location.href = '/'}
                    className="text-white px-8 py-3"
                    style={{ backgroundColor: '#13493f' }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0f3d35'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#13493f'}
                  >
                    Visit W3-Energy.org
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-teal-50" style={{ background: 'linear-gradient(to bottom, #f0fdfa, #ffffff, #f0fdfa)' }}>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Button
              onClick={() => window.open('https://w3-energy.org', '_blank')}
              variant="outline"
              className="hover:bg-teal-50"
              style={{ borderColor: '#41a290', color: '#13493f' }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Visit W3-Energy.org
            </Button>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Image 
                src="/logo/logo.png" 
                alt="W3-Energy Logo" 
                width={60} 
                height={60} 
                className="h-15 w-15"
              />
              <h1 className="text-4xl font-bold text-gray-900">W3-Energy</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Be first in line for the future of energy
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              Our platform is currently in beta — access is limited to approved wallets only. 
              Get whitelisted below to secure early access to the W3-Energy on-chain ecosystem.
            </p>
          </div>

          {/* Wallet Connection Status */}
          <div className="mb-8 flex justify-center">
            <Card style={{ borderColor: '#41a290' }}>
              <CardContent className="p-6 text-center">
                {!isConnected ? (
                  <div>
                    <Wallet className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">Connect your wallet to apply for whitelist access</p>
                    <ConnectButton />
                  </div>
                ) : (
                  <div>
                    <CheckCircle className="h-8 w-8 mx-auto mb-3" style={{ color: '#41a290' }} />
                    <p className="text-sm text-gray-600 mb-2">Wallet Connected</p>
                    <p className="font-mono text-sm px-3 py-1 rounded" style={{ backgroundColor: '#13493f', color: '#ffffff' }}>{address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Application Form */}
          {isConnected && (
            <Card className="shadow-lg" style={{ borderColor: '#41a290' }}>
              <CardHeader className="border-b" style={{ backgroundColor: '#f0fdfa', borderColor: '#41a290' }}>
                <CardTitle className="text-2xl flex items-center space-x-2" style={{ color: '#13493f' }}>
                  <MessageSquare className="h-6 w-6" />
                  <span>Whitelist Application</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <User className="h-4 w-4" />
                      <span>Preferred Nickname or ENS Domain</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Optional — use your Web3 identity or create an alias</p>
                    <Input
                      name="nickname"
                      value={formData.nickname}
                      onChange={handleInputChange}
                      placeholder="Enter your nickname, ENS domain, or alias"
                      style={{ borderColor: '#41a290', backgroundColor: '#ffffff', color: '#13493f' }}
                      onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#13493f'}
                      onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = '#41a290'}
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4" />
                      <span>Email Address *</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Must match the one you register with on the platform for early access</p>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your email address"
                      style={{ borderColor: '#41a290', backgroundColor: '#ffffff', color: '#13493f' }}
                      onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#13493f'}
                      onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = '#41a290'}
                    />
                  </div>

                  <div className="p-6 rounded-lg" style={{ backgroundColor: '#f0fdfa' }}>
                    <h3 className="font-semibold mb-4" style={{ color: '#13493f' }}>Early Participant Perks (Optional)</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="participateAirdrops"
                          checked={formData.participateAirdrops}
                          onChange={handleInputChange}
                          className="w-4 h-4 rounded border-2"
                          style={{ accentColor: '#13493f' }}
                        />
                        <span className="text-sm" style={{ color: '#13493f' }}>Yes, I'd like to participate in pre-launch/airdrops</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="joinCompetitions"
                          checked={formData.joinCompetitions}
                          onChange={handleInputChange}
                          className="w-4 h-4 rounded border-2"
                          style={{ accentColor: '#13493f' }}
                        />
                        <span className="text-sm" style={{ color: '#13493f' }}>Yes, I'd like to join competitions & referral challenges</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="bugBountyInterest"
                          checked={formData.bugBountyInterest}
                          onChange={handleInputChange}
                          className="w-4 h-4 rounded border-2"
                          style={{ accentColor: '#13493f' }}
                        />
                        <span className="text-sm" style={{ color: '#13493f' }}>Yes, I'm interested in the bug bounty program</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg" style={{ backgroundColor: '#f0fdfa' }}>
                    <h3 className="font-semibold mb-4" style={{ color: '#13493f' }}>Platform Benefits</h3>
                    <ul className="space-y-2 text-sm" style={{ color: '#13493f' }}>
                      <li>• <strong>Exclusive Access to RWA Energy Tokens</strong> – Invest in tokenized clean energy assets before public launch.</li>
                      <li>• <strong>Early Investor Advantages</strong> – Priority allocations, bonus rewards, and pre-sale pricing.</li>
                      <li>• <strong>Sustainable Investment Opportunities</strong> – Back projects driving the global energy transition.</li>
                      <li>• <strong>Reduced Fees for Beta Users</strong> – Enjoy discounted transaction and platform fees during beta.</li>
                      <li>• <strong>Real-World Climate Impact</strong> – Directly fund and track verified renewable energy and carbon credit projects.</li>
                      <li>• <strong>Participatory Governance</strong> – Shape platform decisions through community voting rights.</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-lg border-2" style={{ borderColor: '#41a290', backgroundColor: '#ffffff' }}>
                    <h3 className="font-semibold mb-4" style={{ color: '#13493f' }}>Important Notes</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Beta Disclaimer:</strong> This is a testing environment. No real funds will be used in the demo. All tokens, trades, and balances are simulated for demonstration purposes only.</li>
                      <li>• <strong>Privacy:</strong> Real names are not required. Use your ENS, alias, or wallet nickname if preferred.</li>
                      <li>• <strong>Jurisdiction:</strong> Some features may be restricted based on your location to comply with applicable laws.</li>
                    </ul>
                  </div>

                  <div className="flex justify-center pt-6">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="text-white px-12 py-3 text-lg"
                      style={{ backgroundColor: '#13493f' }}
                      onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0f3d35'}
                      onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#13493f'}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Application'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center mt-12 text-gray-600">
            <p>Questions? Contact us at <a href="mailto:whitelist@w3-energy.org" className="hover:underline" style={{ color: '#41a290' }}>whitelist@w3-energy.org</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}