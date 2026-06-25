"use client"

import React from 'react'
import AuthForm from '../../components/AuthForm'

export default function RegisterPage() {
  return (
    <div className="w-full flex justify-center items-center min-h-[80vh]">
      <AuthForm isSignUp={true} />
    </div>
  )
}
