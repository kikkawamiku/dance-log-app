"use client"

import { SWRConfig } from "swr"
import { ReactNode } from "react"

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60_000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
