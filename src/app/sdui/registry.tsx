'use client';

import type { ComponentType } from 'react';
import type { SduiComponent } from '@/ei/sdui/types/components';

import { SduiMessage } from './components/message';
import { SduiModeBadge } from './components/mode-badge';
import { SduiSpacer } from './components/spacer';
import { SduiDivider } from './components/divider';
import { SduiScaleInput } from './components/scale-input';
import { SduiTextInput } from './components/text-input';
import { SduiNumericInput } from './components/numeric-input';
import { SduiScopeCard } from './components/scope-card';
import { SduiDealCard } from './components/deal-card';
import { SduiTwoStepCard } from './components/two-step-card';
import { SduiActivationCard } from './components/activation-card';
import { SduiVerificationCard } from './components/verification-card';
import { SduiGuardrailsCard } from './components/guardrails-card';
import { SduiWelcomeBackCard } from './components/welcome-back-card';
import { SduiActionGroup } from './components/action-group';
import { SduiPendingChecks } from './components/pending-checks';
import { SduiSessionTimer } from './components/session-timer';
import { SduiDoneCard } from './components/done-card';

type SduiComponentProps = {
  node: SduiComponent;
  value?: string | number;
  onChange?: (id: string, v: string | number) => void;
  onAction?: (actionId: string) => void;
};

const REGISTRY: Record<string, ComponentType<SduiComponentProps>> = {
  message: SduiMessage as ComponentType<SduiComponentProps>,
  'mode-badge': SduiModeBadge as ComponentType<SduiComponentProps>,
  spacer: SduiSpacer as ComponentType<SduiComponentProps>,
  divider: SduiDivider as ComponentType<SduiComponentProps>,
  'scale-input': SduiScaleInput as ComponentType<SduiComponentProps>,
  'text-input': SduiTextInput as ComponentType<SduiComponentProps>,
  'numeric-input': SduiNumericInput as ComponentType<SduiComponentProps>,
  'scope-card': SduiScopeCard as ComponentType<SduiComponentProps>,
  'deal-card': SduiDealCard as ComponentType<SduiComponentProps>,
  'two-step-card': SduiTwoStepCard as ComponentType<SduiComponentProps>,
  'activation-card': SduiActivationCard as ComponentType<SduiComponentProps>,
  'verification-card': SduiVerificationCard as ComponentType<SduiComponentProps>,
  'guardrails-card': SduiGuardrailsCard as ComponentType<SduiComponentProps>,
  'welcome-back-card': SduiWelcomeBackCard as ComponentType<SduiComponentProps>,
  'action-group': SduiActionGroup as ComponentType<SduiComponentProps>,
  'pending-checks': SduiPendingChecks as ComponentType<SduiComponentProps>,
  'session-timer': SduiSessionTimer as ComponentType<SduiComponentProps>,
  'done-card': SduiDoneCard as ComponentType<SduiComponentProps>,
};

export function getSduiComponent(type: string): ComponentType<SduiComponentProps> | null {
  return REGISTRY[type] ?? null;
}
