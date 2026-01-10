import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Header } from '~/components/layout/Header';
import { Video, Users, Star, Clock, Zap, Shield, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="container px-4 py-24 mx-auto text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Get Expert Help with Your
            <span className="text-primary"> AI Code</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Connect with verified AI experts for 15-minute screen share sessions.
            Debug, optimize, and learn from the best.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/login?mode=signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/experts">Find an Expert</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
          <div>
            <p className="text-3xl font-bold text-primary">500+</p>
            <p className="text-sm text-muted-foreground">Verified Experts</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">10k+</p>
            <p className="text-sm text-muted-foreground">Sessions Completed</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">4.9</p>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container px-4 py-16 mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">1. Find an Expert</h3>
            <p className="text-muted-foreground">
              Browse our verified AI experts by skill, rating, or availability.
            </p>
          </div>
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">2. Book a Session</h3>
            <p className="text-muted-foreground">
              Choose a time that works for you. Sessions are 15-60 minutes.
            </p>
          </div>
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">3. Screen Share</h3>
            <p className="text-muted-foreground">
              Connect via video call and get real-time help with your code.
            </p>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="container px-4 py-16 mx-auto bg-muted/30 rounded-3xl">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Call-an-Expert?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Fast Response</h3>
                <p className="text-muted-foreground">
                  Most experts respond within minutes. Get help when you need it.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Verified Experts</h3>
                <p className="text-muted-foreground">
                  All experts are vetted and rated by real users.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Quality Guaranteed</h3>
                <p className="text-muted-foreground">
                  If you're not satisfied, we'll refund your session.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Flexible Duration</h3>
                <p className="text-muted-foreground">
                  Pay only for the time you need. Sessions from 15 to 60 minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container px-4 py-24 mx-auto text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Help?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of developers who get expert help every day.
          </p>
          <Button size="lg" asChild>
            <Link href="/login?mode=signup">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <span className="font-semibold">Call-an-Expert</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Call-an-Expert. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
