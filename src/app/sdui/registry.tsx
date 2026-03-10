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
import { SduiResumeContextCard } from './components/resume-context-card';
import { SduiPendingItemsList } from './components/pending-items-list';
import { SduiLoopClosedCard } from './components/loop-closed-card';
import { SduiSessionSummaryFooter } from './components/session-summary-footer';
import { SduiIdentityMomentCard } from './components/identity-moment-card';
import { SduiSessionContextBar } from './components/session-context-bar';
import { SduiOnboardingWelcomeCard } from './components/onboarding-welcome-card';
import { SduiOnboardingTopicTaskForm } from './components/onboarding-topic-task-form';
import { SduiTopicInput } from './components/topic-input';
import { SduiFieldBreadcrumb } from './components/field-breadcrumb';
import { SduiPendingHeroCard } from './components/pending-hero-card';

export type SduiComponentProps = {
  node: SduiComponent;
  value?: string | number;
  onChange?: (id: string, v: string | number) => void;
  onAction?: (actionId: string) => void;
  formValues?: Record<string, string | number>;
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
  'resume-context-card': SduiResumeContextCard as ComponentType<SduiComponentProps>,
  'pending-items-list': SduiPendingItemsList as ComponentType<SduiComponentProps>,
  'loop-closed-card': SduiLoopClosedCard as ComponentType<SduiComponentProps>,
  'session-summary-footer': SduiSessionSummaryFooter as ComponentType<SduiComponentProps>,
  'identity-moment-card': SduiIdentityMomentCard as ComponentType<SduiComponentProps>,
  'session-context-bar': SduiSessionContextBar as ComponentType<SduiComponentProps>,
  'onboarding-welcome-card': SduiOnboardingWelcomeCard as ComponentType<SduiComponentProps>,
  'onboarding-topic-task-form': SduiOnboardingTopicTaskForm as ComponentType<SduiComponentProps>,
  'topic-input': SduiTopicInput as ComponentType<SduiComponentProps>,
  'field-breadcrumb': SduiFieldBreadcrumb as ComponentType<SduiComponentProps>,
  'pending-hero-card': SduiPendingHeroCard as ComponentType<SduiComponentProps>,
};

export function getSduiComponent(type: string): ComponentType<SduiComponentProps> | null {
  return REGISTRY[type] ?? null;
}
