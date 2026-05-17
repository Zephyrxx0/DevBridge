"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function Drawer(props: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />
}

function DrawerContent(props: React.ComponentProps<typeof DialogContent>) {
  return <DialogContent {...props} />
}

function DrawerHeader(props: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader {...props} />
}

function DrawerTitle(props: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle {...props} />
}

export { Drawer, DrawerContent, DrawerHeader, DrawerTitle }
