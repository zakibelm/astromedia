import React, { useState } from 'react';
import Logo from './Logo'; // Assuming Logo is in the same dir
import { useTranslation } from '../i18n/useTranslation';

interface LoginPageProps {
    onLoginSuccess: () => void;
    onBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBack }) => {
    const { t } = useTranslation();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate login
        console.log('Login/Signup with:', email, password);
        onLoginSuccess();
    };

    const handleGoogleLogin = () => {
        console.log('Google Login clicked');
        onLoginSuccess();
    };

    return (
        <div className="min-h-screen bg-dark-space text-white flex flex-col">
            {/* Reusing Hero Background Styles with Warm Halo Theme */}
            <section className="relative flex-grow flex flex-col justify-center items-center py-20 px-4 text-center overflow-hidden bg-gradient-to-b from-dark-space via-dark-space-mid to-dark-space">

                {/* Navigation / Back Button */}
                <div className="absolute top-6 left-6 z-20">
                    <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Retour
                    </button>
                </div>

                <div className="container mx-auto z-10 flex flex-col items-center max-w-md w-full">
                    <div className="mb-8 animate-fade-in-down">
                        <Logo />
                    </div>

                    <div className="w-full bg-dark-space-mid/80 backdrop-blur-md p-8 rounded-2xl border border-astro-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.15)] animate-fade-in-up">
                        <h2 className="text-3xl font-bold mb-6 text-center text-white">
                            {isLogin ? t('common.login') : t('common.createAccount')}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-left text-sm font-medium text-gray-400 mb-1">{t('common.email')}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0d0415] border border-astro-amber-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-astro-amber-500 focus:ring-1 focus:ring-astro-amber-500 transition-all"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-left text-sm font-medium text-gray-400 mb-1">{t('common.password')}</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0d0415] border border-astro-amber-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-astro-amber-500 focus:ring-1 focus:ring-astro-amber-500 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {isLogin && (
                                <div className="text-right">
                                    <a href="#" className="text-sm text-astro-cyan-400 hover:text-astro-cyan-300 transition-colors">
                                        {t('common.forgotPassword')}
                                    </a>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-astro-amber-500 to-orange-600 text-white font-bold rounded-lg shadow-lg hover:shadow-astro-amber-500/30 transform hover:scale-[1.02] transition-all duration-200"
                            >
                                {isLogin ? t('common.submit') : t('common.createAccount')}
                            </button>
                        </form>

                        <div className="my-6 flex items-center">
                            <div className="flex-grow border-t border-gray-700"></div>
                            <span className="px-4 text-gray-500 text-sm">Or</span>
                            <div className="flex-grow border-t border-gray-700"></div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full py-3 bg-white text-gray-900 font-bold rounded-lg shadow hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                            </svg>
                            <span>{t('common.googleLogin')}</span>
                        </button>

                        <div className="mt-8 text-center text-sm">
                            <span className="text-gray-400">
                                {isLogin ? t('common.dontHaveAccount') : t('common.alreadyHaveAccount')}
                            </span>
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="ml-2 text-astro-amber-400 font-semibold hover:text-astro-amber-300 focus:outline-none"
                            >
                                {isLogin ? t('common.signup') : t('common.login')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-astro-amber-500/10 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-astro-cyan-500/10 rounded-full blur-3xl opacity-30"></div>
                </div>
            </section>
        </div>
    );
};

export default LoginPage;
