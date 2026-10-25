import React, { useRef } from 'react';
import { ArrowRight, ShieldCheck, LockKeyhole, Fingerprint, HeartHandshake, FileCheck2, FileImage, ScanText, UploadCloud, CheckCircle2, PlayCircle, CircleAlert } from 'lucide-react';
import ThemeButton from './ThemeButton.jsx';

export default function HomePage({ theme, onToggleTheme, onStart }) {
  const videoRef = useRef(null);
  const scrollToVideo = () => videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return <main className="landing-page" data-theme={theme}>
    <header className="landing-header">
      <button className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="HerNest home"><img src={theme === 'dark' ? '/assets/hernest-wordmark-dark.png' : '/assets/hernest-wordmark-transparent.png'} alt="HerNest"/></button>
      <nav className="landing-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a><a href="#resources">Resources</a></nav>
      <div className="landing-header-actions"><ThemeButton theme={theme} onToggle={onToggleTheme}/><button className="button button-primary landing-start" onClick={onStart}>Start a case <ArrowRight size={14}/></button></div>
    </header>

    <section className="landing-hero">
      <div className="hero-copy">
        <span className="hero-kicker"><ShieldCheck size={13}/> DIGITAL SAFETY COMPANION</span>
        <h1>Your evidence.<br/><em>Your voice.</em><br/>Your next step.</h1>
        <p className="hero-summary">Turn messages and screenshots into clear, privacy-conscious next steps.</p>
        <div className="hero-actions"><button className="button button-primary button-large" onClick={onStart}>Get started <ArrowRight size={16}/></button><button className="button button-soft button-large" onClick={scrollToVideo}><PlayCircle size={16}/> Watch the guide <span>~41 sec</span></button></div>
        <div className="hero-trust"><span><LockKeyhole size={14}/> Local-first</span><span><Fingerprint size={14}/> Evidence-linked</span><span><HeartHandshake size={14}/> You choose</span></div>
      </div>
      <div className="hero-art" aria-label="HerNest brand mark and product promise"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-brand-lockup"><img className="hero-mark" src={theme === 'dark' ? '/assets/hernest-mark-dark.png' : '/assets/hernest-mark-transparent.png'} alt=""/><span className="hero-wordmark">Her<em>Nest</em></span></div><div className="hero-note hero-note-top"><ShieldCheck size={15}/><span>Review before sharing</span></div><div className="hero-note hero-note-bottom"><FileCheck2 size={15}/><span>Clear next steps</span></div><div className="hero-stamp">YOUR STORY<br/><strong>YOUR CHOICE</strong></div></div>
    </section>

    <section className="benefit-grid" aria-label="Key benefits">
      <article className="benefit-card"><span className="benefit-icon"><FileImage size={18}/></span><div><h3>Bring the evidence</h3><p>Chat exports, screenshots or posts.</p></div></article>
      <article className="benefit-card"><span className="benefit-icon"><ScanText size={18}/></span><div><h3>Check the details</h3><p>OCR text you can correct.</p></div></article>
      <article className="benefit-card"><span className="benefit-icon"><HeartHandshake size={18}/></span><div><h3>Guidance that fits</h3><p>Routes based on confirmed facts.</p></div></article>
      <article className="benefit-card"><span className="benefit-icon"><FileCheck2 size={18}/></span><div><h3>Export when ready</h3><p>Keep or share your own report.</p></div></article>
    </section>

    <section className="how-section" id="how-it-works">
      <div className="section-heading-home"><div><span className="home-eyebrow">SIMPLE BY DESIGN</span><h2>From scattered to structured.</h2></div><p>Four steps. You stay in control.</p></div>
      <div className="home-steps">
        <article><span className="home-step-num">01</span><div className="home-step-icon"><UploadCloud size={19}/></div><h3>Import</h3><p>Add a chat or screenshot.</p></article>
        <article><span className="home-step-num">02</span><div className="home-step-icon"><ScanText size={19}/></div><h3>Review</h3><p>Correct OCR and mask details.</p></article>
        <article><span className="home-step-num">03</span><div className="home-step-icon"><CheckCircle2 size={19}/></div><h3>Confirm</h3><p>Approve only supported facts.</p></article>
        <article><span className="home-step-num">04</span><div className="home-step-icon"><FileCheck2 size={19}/></div><h3>Take action</h3><p>Choose routes and export.</p></article>
      </div>
    </section>

    <section className="video-section" id="watch-demo" ref={videoRef}>
      <div className="video-copy"><span className="home-eyebrow">A QUICK TOUR</span><h2>See how HerNest works.</h2><p>A short illustrated walkthrough of the steps. It uses fictional data, not a live case recording.</p><div className="video-chapters"><span><CheckCircle2 size={14}/> Add evidence</span><span><CheckCircle2 size={14}/> Review and confirm</span><span><CheckCircle2 size={14}/> Export a report</span></div></div>
      <div className="video-frame"><video controls preload="metadata" poster="/assets/hernest-walkthrough-poster.jpg" aria-label="HerNest walkthrough video"><source src="/assets/hernest-walkthrough.mp4" type="video/mp4"/>Your browser does not support embedded video. <a href="/assets/hernest-walkthrough.mp4">Open the walkthrough video.</a></video><div className="video-caption"><span><PlayCircle size={14}/> Illustrated walkthrough · 42 sec</span><span>On-screen guidance · fictional sample</span></div></div>
    </section>

    <section className="privacy-section" id="privacy">
      <div className="privacy-section-heading"><span className="privacy-large-icon"><LockKeyhole size={20}/></span><div><span className="home-eyebrow">PRIVACY, WITHOUT BIG PROMISES</span><h2>Your evidence stays in your hands.</h2></div></div>
      <div className="privacy-facts-grid"><div><CheckCircle2 size={15}/><span><strong>Local by default</strong><small>Import, hashing, OCR and PDF work in your browser.</small></span></div><div><CheckCircle2 size={15}/><span><strong>No case database</strong><small>HerNest does not save case files on its server.</small></span></div><div><CircleAlert size={15}/><span><strong>AI is optional</strong><small>Only synthetic demo text is sent for demo analysis.</small></span></div></div>
      <p className="privacy-footnote">OCR assets are self-hosted and loaded only when you request OCR. If synthetic demo AI is enabled, the approved fictional text is sent to the configured AI provider. A PDF may contain selected messages or original screenshots. HerNest cannot erase browser history, screenshots, downloads, or anything you share outside the app.</p>
    </section>

    <section className="resources-home" id="resources"><div><span className="home-eyebrow">CASE-BASED GUIDANCE</span><h2>Not every case needs the same route.</h2><p>HerNest shows specialist options only when a user confirms matching facts. Local support centres are not guessed; official routes help users find the right service.</p></div><div className="resource-rule-list"><div><span className="rule-dot"/><span><strong>Intimate-image concern</strong><small>StopNCII eligibility, only where it applies.</small></span></div><div><span className="rule-dot"/><span><strong>Financial cyber fraud</strong><small>1930 reporting guidance.</small></span></div><div><span className="rule-dot"/><span><strong>Immediate physical danger</strong><small>112 information only when the user selects it.</small></span></div></div></section>

    <footer className="landing-footer"><img src={theme === 'dark' ? '/assets/hernest-mark-dark.png' : '/assets/hernest-mark-transparent.png'} alt=""/><span>HerNest · Your evidence. Your voice. Your next step.</span><button onClick={onStart}>Start a case <ArrowRight size={14}/></button></footer>
  </main>;
}
