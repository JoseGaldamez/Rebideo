"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import UploadConsole from '../../components/UploadConsole'
import { useAuth } from '../../components/AppShell'

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()

  const onCancel = () => {
    router.push('/')
  }

  const onUploadSuccess = () => {
    router.push('/library')
  }

  return (
    <div className="w-full max-w-[1300px] mx-auto py-8 px-4 md:px-16">
      {user && (
        <UploadConsole 
          user={user} 
          onCancel={onCancel} 
          onUploadSuccess={onUploadSuccess} 
        />
      )}
    </div>
  )
}
