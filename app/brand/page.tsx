"use client"

import { Logo, LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Check, Download, Copy, ArrowRight, Shield, Award, FileCheck, Users } from "lucide-react"
import { useState } from "react"

const colorPalette = [
  {
    name: "Primary Navy",
    hex: "#1a1f4e",
    rgb: "26, 31, 78",
    usage: "Primary brand color, headers, CTAs",
    variable: "--primary",
  },
  {
    name: "Gold Accent",
    hex: "#c9a227",
    rgb: "201, 162, 39",
    usage: "Accent elements, highlights, achievements",
    variable: "--accent",
  },
  {
    name: "Warm Cream",
    hex: "#f8f6f3",
    rgb: "248, 246, 243",
    usage: "Backgrounds, cards, light surfaces",
    variable: "--background",
  },
  {
    name: "Success Green",
    hex: "#16a34a",
    rgb: "22, 163, 74",
    usage: "Success states, verified badges",
    variable: "--success",
  },
  {
    name: "Text Dark",
    hex: "#1c1917",
    rgb: "28, 25, 23",
    usage: "Body text, headings",
    variable: "--foreground",
  },
]

const typographyScale = [
  { name: "Display", class: "font-serif text-6xl font-bold", sample: "The Big Class" },
  { name: "Heading 1", class: "font-serif text-4xl font-bold", sample: "Professional Certificates" },
  { name: "Heading 2", class: "font-serif text-3xl font-semibold", sample: "Generate at Scale" },
  { name: "Heading 3", class: "font-sans text-xl font-semibold", sample: "Feature Section" },
  { name: "Body Large", class: "font-sans text-lg", sample: "The modern way to issue certificates" },
  { name: "Body", class: "font-sans text-base", sample: "Create, manage, and verify professional certificates with ease." },
  { name: "Small", class: "font-sans text-sm text-muted-foreground", sample: "Supporting text and captions" },
]

function ColorSwatch({ color }: { color: typeof colorPalette[0] }) {
  const [copied, setCopied] = useState(false)
  
  const copyHex = () => {
    navigator.clipboard.writeText(color.hex)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="group">
      <div 
        className="aspect-square rounded-xl shadow-md mb-3 cursor-pointer transition-transform hover:scale-105 flex items-end p-3"
        style={{ backgroundColor: color.hex }}
        onClick={copyHex}
      >
        <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-md p-1.5">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-600" />}
        </button>
      </div>
      <h4 className="font-semibold text-sm">{color.name}</h4>
      <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
      <p className="text-xs text-muted-foreground mt-1">{color.usage}</p>
    </div>
  )
}

export default function BrandPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <nav className="flex items-center gap-6">
            <a href="#logo" className="text-sm font-medium hover:text-primary transition-colors">Logo</a>
            <a href="#colors" className="text-sm font-medium hover:text-primary transition-colors">Colors</a>
            <a href="#typography" className="text-sm font-medium hover:text-primary transition-colors">Typography</a>
            <a href="#components" className="text-sm font-medium hover:text-primary transition-colors">Components</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Brand Guidelines</Badge>
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-primary mb-6 text-balance">
            The Big Class Design System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A comprehensive guide to our visual identity, typography, colors, and component patterns.
          </p>
        </div>
      </section>

      {/* Logo Section */}
      <section id="logo" className="py-16 px-6 bg-card border-y">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="font-serif text-3xl font-bold text-primary mb-3">Logo</h2>
            <p className="text-muted-foreground max-w-2xl">
              Our logo combines a shield symbol representing trust and security with a certificate ribbon, 
              embodying our commitment to authentic, verifiable credentials.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Primary Logo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Primary</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8 bg-background rounded-lg">
                <Logo size="lg" variant="default" />
              </CardContent>
            </Card>
            
            {/* White Logo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">On Dark</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8 bg-primary rounded-lg">
                <Logo size="lg" variant="white" />
              </CardContent>
            </Card>
            
            {/* Icon Only */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Icon Mark</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8 bg-background rounded-lg">
                <Logo size="xl" variant="icon" />
              </CardContent>
            </Card>
            
            {/* Small Usage */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Small Usage</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8 bg-background rounded-lg gap-4">
                <LogoMark size={24} />
                <LogoMark size={32} />
                <LogoMark size={40} />
              </CardContent>
            </Card>
          </div>
          
          {/* Logo Sizes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Size Variations</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-center gap-12 py-8 flex-wrap">
              <div className="text-center">
                <Logo size="sm" />
                <p className="text-xs text-muted-foreground mt-2">Small</p>
              </div>
              <div className="text-center">
                <Logo size="md" />
                <p className="text-xs text-muted-foreground mt-2">Medium</p>
              </div>
              <div className="text-center">
                <Logo size="lg" />
                <p className="text-xs text-muted-foreground mt-2">Large</p>
              </div>
              <div className="text-center">
                <Logo size="xl" />
                <p className="text-xs text-muted-foreground mt-2">Extra Large</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Colors Section */}
      <section id="colors" className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="font-serif text-3xl font-bold text-primary mb-3">Color Palette</h2>
            <p className="text-muted-foreground max-w-2xl">
              Our colors convey trust, professionalism, and achievement. The deep navy represents authority 
              and reliability, while gold accents celebrate accomplishment.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12">
            {colorPalette.map((color) => (
              <ColorSwatch key={color.hex} color={color} />
            ))}
          </div>
          
          {/* Gradient Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Gradient Applications</CardTitle>
              <CardDescription>Reserved for special emphasis and certificate backgrounds</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div className="h-24 rounded-lg bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
                <span className="text-white font-medium">Primary Gradient</span>
              </div>
              <div className="h-24 rounded-lg bg-gradient-to-r from-accent to-amber-400 flex items-center justify-center">
                <span className="text-primary font-medium">Accent Gradient</span>
              </div>
              <div className="h-24 rounded-lg bg-gradient-to-br from-primary via-primary/90 to-accent/20 flex items-center justify-center">
                <span className="text-white font-medium">Hero Gradient</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Typography Section */}
      <section id="typography" className="py-16 px-6 bg-card border-y">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="font-serif text-3xl font-bold text-primary mb-3">Typography</h2>
            <p className="text-muted-foreground max-w-2xl">
              We pair Playfair Display for elegant headings with Inter for clean, readable body text. 
              This combination balances professionalism with modern clarity.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>Playfair Display</CardTitle>
                <CardDescription>Headlines & Display Text</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-serif text-4xl font-bold text-primary mb-2">Aa Bb Cc</p>
                <p className="font-serif text-2xl text-muted-foreground">The quick brown fox jumps over the lazy dog</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Inter</CardTitle>
                <CardDescription>Body & UI Text</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-sans text-4xl font-bold text-primary mb-2">Aa Bb Cc</p>
                <p className="font-sans text-lg text-muted-foreground">The quick brown fox jumps over the lazy dog</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Type Scale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {typographyScale.map((item) => (
                <div key={item.name} className="flex items-baseline gap-6 pb-4 border-b last:border-0 last:pb-0">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{item.name}</span>
                  <span className={item.class}>{item.sample}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Components Section */}
      <section id="components" className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="font-serif text-3xl font-bold text-primary mb-3">Components</h2>
            <p className="text-muted-foreground max-w-2xl">
              Pre-built UI components following our design system for consistent user experiences.
            </p>
          </div>
          
          {/* Buttons */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Buttons</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button className="bg-accent hover:bg-accent/90 text-primary">
                <Award className="mr-2 h-4 w-4" />
                Generate Certificate
              </Button>
            </CardContent>
          </Card>
          
          {/* Badges */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Badges & Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <Check className="mr-1 h-3 w-3" />
                Verified
              </Badge>
              <Badge className="bg-accent/10 text-accent border-accent/20">Premium</Badge>
              <Badge className="bg-primary text-primary-foreground">New</Badge>
            </CardContent>
          </Card>
          
          {/* Form Elements */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Form Elements</CardTitle>
            </CardHeader>
            <CardContent className="max-w-md space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                <Input type="email" placeholder="name@institution.edu" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Certificate ID</label>
                <div className="flex gap-2">
                  <Input placeholder="CERT-2024-XXXXX" className="font-mono" />
                  <Button>Verify</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Feature Cards */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Feature Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { icon: Shield, title: "Secure", desc: "Tamper-proof certificates" },
                  { icon: Award, title: "Professional", desc: "Beautiful templates" },
                  { icon: FileCheck, title: "Verifiable", desc: "Public verification" },
                  { icon: Users, title: "Scalable", desc: "Batch generation" },
                ].map((feature) => (
                  <div key={feature.title} className="p-4 rounded-xl bg-muted/50 text-center">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Certificate Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Certificate Preview</CardTitle>
              <CardDescription>Classic template example</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-[1.414/1] max-w-2xl mx-auto border-8 border-primary/10 rounded-lg bg-gradient-to-br from-amber-50 to-white p-8 relative overflow-hidden">
                {/* Decorative corners */}
                <div className="absolute top-4 left-4 w-16 h-16 border-l-4 border-t-4 border-accent/40" />
                <div className="absolute top-4 right-4 w-16 h-16 border-r-4 border-t-4 border-accent/40" />
                <div className="absolute bottom-4 left-4 w-16 h-16 border-l-4 border-b-4 border-accent/40" />
                <div className="absolute bottom-4 right-4 w-16 h-16 border-r-4 border-b-4 border-accent/40" />
                
                <div className="text-center relative z-10 h-full flex flex-col justify-between py-4">
                  <div>
                    <Logo size="md" className="justify-center mb-4" />
                    <p className="text-accent uppercase tracking-[0.3em] text-sm font-medium">Certificate of Completion</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground mb-2">This is to certify that</p>
                    <h3 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-2">Jane Doe</h3>
                    <p className="text-muted-foreground mb-4">has successfully completed</p>
                    <h4 className="font-serif text-xl md:text-2xl font-semibold text-primary mb-1">Advanced Web Development</h4>
                    <p className="text-sm text-muted-foreground">March 15, 2024</p>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="text-left">
                      <div className="w-32 border-t border-primary/30 mb-1" />
                      <p className="text-xs text-muted-foreground">Instructor</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                        <Award className="h-8 w-8 text-accent" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-32 border-t border-primary/30 mb-1" />
                      <p className="text-xs text-muted-foreground">Date</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-16 px-6 bg-primary text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="font-serif text-3xl font-bold mb-4">Download Brand Assets</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Get all logo files, color specifications, and typography guidelines in one package.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="secondary" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Logo Package
            </Button>
            <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
              View Full Guidelines
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t">
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            The Big Class Brand Guidelines v1.0
          </p>
        </div>
      </footer>
    </div>
  )
}
