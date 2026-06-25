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
    <>
      <div className="backdrop-blur-md bg-zinc-900/45 p-10 border border-outline rounded-3xl w-full max-w-[440px] shadow-2xl flex flex-col items-center relative">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-sora text-primary mb-1">Rebideo</h2>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-80">Premium Content Portal</p>
      </div>

      <form onSubmit={handleAuth} className="w-full">
        {/* Email Field */}
        <div className="flex flex-col gap-3 mb-6 w-full">
          <label htmlFor="email" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Email Address</label>
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">mail</span>
            <input 
              type="email" 
              id="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="name@company.com"
              className="w-full bg-white/[0.03] border border-outline focus:border-primary rounded-xl py-3.5 pr-4 pl-12 text-white font-inter text-sm transition-all outline-none"
              disabled={authLoading}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-3 mb-6 w-full">
          <div className="flex justify-between items-center">
            <label htmlFor="password" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Password</label>
            <a href="#" className="text-[10px] font-bold text-secondary transition-opacity hover:opacity-80" onClick={(e) => { e.preventDefault(); forgotPassword(); }}>
              Olvidé mi contraseña
            </a>
          </div>
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">lock</span>
            <input 
              type={showPassword ? 'text' : 'password'} 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
              className="w-full bg-white/[0.03] border border-outline focus:border-primary rounded-xl py-3.5 pr-4 pl-12 text-white font-inter text-sm transition-all outline-none"
              disabled={authLoading}
            />
            <button 
              type="button" 
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-on-surface-variant hover:text-white cursor-pointer flex items-center justify-center p-1"
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
          className="mt-3 h-12 w-full flex items-center justify-center bg-primary hover:bg-[#e9ddff] text-on-primary font-bold text-sm rounded-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none" 
          disabled={authLoading}
        >
          {authLoading ? (
            <span className="w-5 h-5 border-2 border-white/10 border-l-on-primary rounded-full animate-spin"></span>
          ) : (
            <span>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
          )}
        </button>
      </form>

      {/* Social Logins Mockup */}
      <div className="w-full flex items-center my-7 relative justify-center">
        <div className="absolute left-0 right-0 h-px bg-outline z-0"></div>
        <span className="bg-[#0f121a] px-4 text-on-surface-variant text-[10px] uppercase font-bold tracking-widest z-10 mx-auto">O continúa con</span>
      </div>

      <div className="flex gap-4 w-full mb-6">
        <button className="flex-1 py-2.5 px-4 border border-outline hover:border-white/30 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all bg-white/[0.02] cursor-pointer" onClick={() => socialLogin('Google')}>
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" alt="Google" className="w-4 h-4" />
          <span>Google</span>
        </button>
        <button className="flex-1 py-2.5 px-4 border border-outline hover:border-white/30 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all bg-white/[0.02] cursor-pointer" onClick={() => socialLogin('Apple')}>
          <span className="material-symbols-outlined text-lg">apple</span>
          <span>Apple</span>
        </button>
      </div>

      {/* Toggle Sign In / Sign Up */}
      <div className="text-xs text-on-surface-variant flex gap-1.5 mb-8">
        <span>{isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}</span>
        <Link href={isSignUp ? '/login' : '/register'} className="text-primary hover:opacity-85 font-semibold transition-opacity">
          {isSignUp ? 'Iniciar Sesión' : 'Crear una cuenta'}
        </Link>
      </div>

      {/* Security Footer */}
      <div className="flex items-center gap-1.5 color-on-surface-variant opacity-50 text-[10px] uppercase font-bold tracking-widest">
        <span className="material-symbols-outlined text-sm">shield</span>
        <span>Protocolo de Seguridad AES-256</span>
      </div>
    </div>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </>
  )
}
