import React from 'react'

type Props = {
  title: string
}

export default function PanelHeader({ title }: Props) {
  return (
    <div className="panel-header" style={{ background: 'var(--panel-header-bg)', borderBottom: '1px solid #e5e7eb', padding: '10px 12px' }}>
      <span className="font-sm font-semibold text-foreground">{title}</span>
    </div>
  )
}
