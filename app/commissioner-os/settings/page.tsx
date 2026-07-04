import { Settings as SettingsIcon } from 'lucide-react'
import { CommissionerPageContainer } from '@/components/commissioner-os/shell/CommissionerPageContainer'
import { ModulePlaceholder } from '@/components/commissioner-os/shell/ModulePlaceholder'

export default function SettingsPage() {
  return (
    <CommissionerPageContainer>
      <ModulePlaceholder
        icon={SettingsIcon}
        title="Settings"
        description="Pure configuration — league identity, constitution, rules, integrations, roles. The least 'intelligent' surface in Commissioner OS by design."
      />
    </CommissionerPageContainer>
  )
}
