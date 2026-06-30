"use client"
import React, { useState } from 'react'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth'
import Link from 'next/link'
import { auth } from '../lib/firebase'
import Toast from './Toast'

interface AuthFormProps {
  isSignUp?: boolean
}

export default function AuthForm({ isSignUp = false }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  const forgotPassword = () => {
    alert('Se ha enviado un enlace para restablecer la contraseña a: ' + (email || 'tu correo electrónico.'))
  }

  const socialLogin = (provider: string) => {
    alert(`Inicio de sesión con ${provider} (Demostración de Integración).`)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)
    setAuthLoading(true)

    if (!auth) {
      setToast({ message: 'Firebase no está inicializado.', type: 'error' })
      setAuthLoading(false)
      return
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      setEmail('')
      setPassword('')
    } catch (err: any) {
      let msg = 'Error al autenticar: ' + err.message
      const isValidationError = 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/email-already-in-use' ||
        err.code === 'auth/weak-password' ||
        err.code === 'auth/invalid-email'

      if (isValidationError) {
        console.warn('Autenticación fallida (controlada):', err.code)
        if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          msg = 'El inicio de sesión falló. Por favor, revisa tus credenciales.'
        } else if (err.code === 'auth/email-already-in-use') {
          msg = 'El correo ya está registrado.'
        } else if (err.code === 'auth/weak-password') {
          msg = 'La contraseña debe tener al menos 6 caracteres.'
        } else if (err.code === 'auth/invalid-email') {
          msg = 'El correo ingresado no es válido.'
        }
      } else {
        console.error('Error inesperado de autenticación:', err)
      }
      setToast({ message: msg, type: 'error' })
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-6">
      {/* Background Image (Blurred for a softer, less distracting texture) */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none select-none bg-cover bg-center transition-all duration-1000 blur-[8px] scale-[1.05]"
        style={{
          backgroundImage: `url(${isSignUp ? '/register-bg.jpg' : '/login-bg.jpg'})`
        }}
      />

      {/* Slow Moving Dark Gradient Overlay */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none select-none bg-[length:200%_200%] animate-gradient-slow opacity-95"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(10, 12, 16, 0.93) 0%, rgba(55, 30, 95, 0.42) 35%, rgba(15, 60, 85, 0.38) 70%, rgba(10, 12, 16, 0.95) 100%)'
        }}
      />

      {/* Background Glowing Ambient Light (Drifting Orbs covering full viewport) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none opacity-80 mix-blend-screen">
        <div className="absolute -top-[10%] -left-[10%] w-[320px] md:w-[450px] h-[320px] md:h-[450px] rounded-full bg-primary/10 blur-[90px] md:blur-[120px] animate-float-1"></div>
        <div className="absolute -bottom-[15%] -right-[10%] w-[360px] md:w-[500px] h-[360px] md:h-[500px] rounded-full bg-secondary/8 blur-[110px] md:blur-[140px] animate-float-2"></div>
        <div className="absolute top-[30%] -right-[15%] w-[260px] md:w-[350px] h-[260px] md:h-[350px] rounded-full bg-tertiary/6 blur-[80px] md:blur-[100px] animate-float-3"></div>
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-[420px] glass p-8 md:p-10 rounded-[28px] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl animate-fade-in flex flex-col items-center">
        {/* Logo and Greeting */}
        <div className="text-center mb-8 flex flex-col items-center select-none">
          <div className="w-11 h-11 rounded-xl bg-white text-black flex items-center justify-center font-sora font-extrabold text-xl mb-4 shadow-xl shadow-white/5 hover:scale-105 transition-transform duration-300">
            R
          </div>
          <h2 className="text-xl font-bold font-sora text-white tracking-tight">
            {isSignUp ? 'Crea tu cuenta' : 'Ingresa a Rebideo'}
          </h2>
          <p className="text-xs text-white/40 font-light mt-1.5">
            {isSignUp ? 'Únete al portal de vídeo más fácil y rápido' : 'El portal para compartir tus vídeos'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="w-full">
          {/* Email Field */}
          <div className="flex flex-col gap-2 mb-5 w-full group">
            <label htmlFor="email" className="text-[10px] font-semibold text-white/45 uppercase tracking-[0.12em]">
              Correo Electrónico
            </label>
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-primary transition-colors text-xl">
                mail
              </span>
              <input 
                type="email" 
                id="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required 
                placeholder="nombre@compania.com"
                className="w-full bg-white/[0.015] border border-white/[0.08] hover:border-white/15 focus:border-primary/50 focus:bg-white/[0.035] rounded-xl py-3.5 pr-4 pl-12 text-white font-inter text-sm transition-all duration-300 outline-none focus:ring-1 focus:ring-primary/20 shadow-inner"
                disabled={authLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-2 mb-6 w-full group">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-[10px] font-semibold text-white/45 uppercase tracking-[0.12em]">
                Contraseña
              </label>
              {!isSignUp && (
                <a href="#" className="text-[10px] font-semibold text-primary/60 hover:text-primary transition-colors" onClick={(e) => { e.preventDefault(); forgotPassword(); }}>
                  ¿Olvidaste tu contraseña?
                </a>
              )}
            </div>
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-primary transition-colors text-xl">
                lock
              </span>
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required 
                placeholder="••••••••"
                className="w-full bg-white/[0.015] border border-white/[0.08] hover:border-white/15 focus:border-primary/50 focus:bg-white/[0.035] rounded-xl py-3.5 pr-12 pl-12 text-white font-inter text-sm transition-all duration-300 outline-none focus:ring-1 focus:ring-primary/20 shadow-inner"
                disabled={authLoading}
              />
              <button 
                type="button" 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-white/25 hover:text-white cursor-pointer flex items-center justify-center p-1 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                disabled={authLoading}
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Submit Trigger */}
          <button 
            type="submit" 
            className="mt-2 h-12 w-full flex items-center justify-center bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider rounded-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none" 
            disabled={authLoading}
          >
            {authLoading ? (
              <span className="w-5 h-5 border-2 border-black/10 border-l-black rounded-full animate-spin"></span>
            ) : (
              <span>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="w-full flex items-center gap-3 my-6 select-none">
          <div className="flex-1 h-px bg-white/[0.06]"></div>
          <span className="text-[9px] text-white/25 uppercase font-semibold tracking-[0.18em]">O continúa con</span>
          <div className="flex-1 h-px bg-white/[0.06]"></div>
        </div>

        {/* Social Logins */}
        <div className="w-full mb-6">
          <button 
            className="w-full py-3 px-4 border border-white/[0.08] hover:border-white/20 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-all duration-300 bg-white/[0.01] hover:bg-white/[0.03] cursor-pointer" 
            onClick={() => socialLogin('Google')}
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
              alt="Google" 
              className="w-4 h-4" 
            />
            <span>Google</span>
          </button>
        </div>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-xs text-white/40 flex items-center gap-1.5 mb-6">
          <span>{isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}</span>
          <Link href={isSignUp ? '/login' : '/register'} className="text-primary hover:text-[#ebdfff] transition-colors font-medium">
            {isSignUp ? 'Iniciar Sesión' : 'Crea una cuenta'}
          </Link>
        </div>

        {/* Security Footer */}
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/30 font-medium border-t border-white/[0.04] pt-5 w-full justify-center select-none">
          <span className="material-symbols-outlined text-xs">shield</span>
          <span>Seguridad de extremo a extremo</span>
        </div>
      </div>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
          duration={5000}
        />
      )}
    </div>
  )
}
