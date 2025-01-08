import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import { FaBolt, FaFlask, FaMoneyBill, FaServer } from 'react-icons/fa';
import { GiSparkles, GiLightningArc } from 'react-icons/gi';

// Lightning bolt SVG component
const LightningPattern = () => (
    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100">
        <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        >
            <path
                d="M50 10 L45 40 L60 45 L40 90 L45 60 L30 55 L50 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-primary"
            />
            <motion.path
                d="M50 10 L45 40 L60 45 L40 90 L45 60 L30 55 L50 10"
                fill="currentColor"
                className="text-primary"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
        </motion.g>
    </svg>
);

// Energetic loading spinner
const LoadingSpinner = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-base-300 bg-opacity-50 z-50">
        <motion.div
            animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className="text-primary text-6xl"
        >
            <FaBolt />
        </motion.div>
    </div>
);

// Feature card component with electric effects
const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        viewport={{ once: true }}
        whileHover={{
            scale: 1.05,
            boxShadow: "0 0 20px rgba(var(--p), 0.5)",
        }}
        className="card bg-base-200 shadow-xl backdrop-blur-lg bg-opacity-50 hover:shadow-2xl transition-all duration-300 overflow-hidden"
    >
        <div className="card-body relative">
            <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.1 }}
            >
                <LightningPattern />
            </motion.div>
            <motion.div
                className="text-4xl text-primary mb-4"
                animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Icon />
            </motion.div>
            <h3 className="card-title text-xl font-bold">{title}</h3>
            <p>{description}</p>
        </div>
    </motion.div>
);

const LandingPage = () => {
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const fullText = "⚡ Supercharge Your Communication ⚡";

    useEffect(() => {
        // Simulate loading
        setTimeout(() => setLoading(false), 1500);

        // Typewriter effect
        let currentIndex = 0;
        const intervalId = setInterval(() => {
            setText(fullText.slice(0, currentIndex + 1));
            currentIndex++;
            if (currentIndex === fullText.length) clearInterval(intervalId);
        }, 100);

        return () => clearInterval(intervalId);
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-base-100 w-screen overflow-x-hidden">
            {/* Navigation */}
            <nav className="navbar fixed top-0 z-50 bg-base-100 bg-opacity-90 backdrop-blur-sm shadow-lg w-screen">
                <div className="w-full px-4 md:px-8">
                    <div className="flex-1">
                        <Link to="/" className="btn btn-ghost px-2 h-16">
                            <img 
                                src="/assets/logo_light.png" 
                                alt="ZapZing Logo" 
                                className="h-14 block dark:hidden" 
                            />
                            <img 
                                src="/assets/logo_dark.png" 
                                alt="ZapZing Logo" 
                                className="h-14 hidden dark:block" 
                            />
                        </Link>
                    </div>
                    <div className="flex-none gap-2">
                        <Link to="/auth" className="btn btn-ghost">Login</Link>
                        <Link to="/auth" className="btn btn-primary gap-2">
                            Get Started
                            <GiLightningArc className="animate-bounce" />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero min-h-screen w-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20 relative overflow-hidden">
                <div className="absolute inset-0">
                    <LightningPattern />
                </div>
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5"
                    animate={{
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <div className="hero-content text-center relative w-full px-4 md:px-8">
                    <div className="max-w-4xl mx-auto">
                        <motion.h1
                            className="text-5xl md:text-7xl font-bold mb-8 text-base-content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            {text}
                        </motion.h1>
                        <motion.p
                            className="text-xl mb-8 opacity-80"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            Slack, I know you're out there. I'm ready to be bought.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1 }}
                            whileHover={{ scale: 1.05 }}
                        >
                            <Link
                                to="/auth"
                                className="btn btn-primary btn-lg gap-2 transform transition-all duration-300 hover:shadow-lg hover:shadow-primary/50"
                            >
                                Start Your Journey
                                <GiSparkles className="animate-spin-slow" />
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="w-screen py-20 bg-base-200 relative overflow-hidden">
                <div className="w-full px-4 md:px-8">
                    <h2 className="text-4xl font-bold text-center mb-16">Why Choose ZapZing? ⚡</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                        <FeatureCard
                            icon={FaMoneyBill}
                            title="Sellable"
                            description="Ready to be bought by Slack"
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={FaBolt}
                            title="Instant Sync"
                            description="Stay in sync with your team, while they're pretending to work"
                            delay={0.4}
                        />
                        <FeatureCard
                            icon={GiSparkles}
                            title="Smart Features"
                            description="AI-powered assistance and annoyance"
                            delay={0.6}
                        />
                        <FeatureCard
                            icon={FaServer}
                            title="Powerful Backend"
                            description="Hobby-grade infrastructure that probably won't crash"
                            delay={0.8}
                        />
                    </div>
                </div>
            </section>

            {/* Social Proof Section */}
            <section className="w-screen py-20">
                <div className="w-full px-4 md:px-8">
                    <h2 className="text-4xl font-bold text-center mb-2">Trusted by My Immediate Family</h2>
                    <div className="flex flex-wrap justify-center gap-8 max-w-7xl mx-auto">
                        <img src="/assets/mom.jpg" alt="Mom's testimonial" className="w-20 h-20 rounded-full object-cover" />
                        <img src="/assets/dad.jpg" alt="Dad's testimonial" className="w-20 h-20 rounded-full object-cover" />
                        <img src="/assets/uncle.jpg" alt="Uncle's testimonial" className="w-20 h-20 rounded-full object-cover" />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer footer-center p-10 bg-gradient-to-t from-base-300 to-base-200 text-base-content w-screen">
                <div>
                    <div className="grid grid-flow-col gap-4">
                        <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" className="btn btn-ghost btn-square group" target="_blank" rel="noopener noreferrer">
                            <FiGithub className="w-6 h-6 group-hover:animate-bounce" />
                        </a>
                        <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" className="btn btn-ghost btn-square group" target="_blank" rel="noopener noreferrer">
                            <FiTwitter className="w-6 h-6 group-hover:animate-bounce" />
                        </a>
                        <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" className="btn btn-ghost btn-square group" target="_blank" rel="noopener noreferrer">
                            <FiLinkedin className="w-6 h-6 group-hover:animate-bounce" />
                        </a>
                    </div>
                </div>
                <div>
                    <p>Copyright © 2024 - All rights reserved by <a href="https://jared.lmbrt.net">jared</a></p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage; 