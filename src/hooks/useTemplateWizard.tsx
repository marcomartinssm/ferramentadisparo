import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { TemplateButton } from '@/lib/templateValidation';

// ---- Types ----
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
export type TemplateType = 'standard' | 'carousel' | 'lto';
export type ParameterFormat = 'POSITIONAL' | 'NAMED';
export type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
export type OtpType = 'COPY_CODE' | 'ONE_TAP' | 'ZERO_TAP';

export interface CarouselCard {
  mediaType: 'IMAGE' | 'VIDEO';
  mediaUrl?: string;
  body: string;
  buttons: TemplateButton[];
}

export interface TemplateState {
  isEditing: boolean;
  templateId: string | null;
  metaTemplateId: string | null;
  name: string;
  category: TemplateCategory;
  language: string;
  parameterFormat: ParameterFormat;
  templateType: TemplateType;
  labels: string[];
  metaConnectionId: string | null;
  header: {
    enabled: boolean;
    type: HeaderType;
    text: string;
    mediaUrl?: string;
    mediaHandle?: string;
    fileName?: string;
    locationLatitude?: string;
    locationLongitude?: string;
    locationName?: string;
    locationAddress?: string;
  };
  body: string;
  carouselCards: CarouselCard[];
  footer: {
    enabled: boolean;
    text: string;
  };
  buttons: TemplateButton[];
  samples: Record<string, string>;
  auth: {
    addSecurityRecommendation: boolean;
    codeExpirationMinutes: number;
    otpType: OtpType;
    packageName: string;
    signatureHash: string;
    autofillText: string;
    ttlSeconds: number;
  };
  currentStep: number;
}

const initialState: TemplateState = {
  isEditing: false,
  templateId: null,
  metaTemplateId: null,
  name: '',
  category: 'MARKETING',
  language: 'pt_BR',
  parameterFormat: 'POSITIONAL',
  templateType: 'standard',
  labels: [],
  metaConnectionId: null,
  header: { enabled: false, type: 'NONE', text: '' },
  body: '',
  carouselCards: [
    { mediaType: 'IMAGE', body: '', buttons: [] },
    { mediaType: 'IMAGE', body: '', buttons: [] },
  ],
  footer: { enabled: false, text: '' },
  buttons: [],
  samples: {},
  auth: {
    addSecurityRecommendation: false,
    codeExpirationMinutes: 5,
    otpType: 'COPY_CODE',
    packageName: '',
    signatureHash: '',
    autofillText: 'Preencher automaticamente',
    ttlSeconds: 300,
  },
  currentStep: 0,
};

// ---- Actions ----
type Action =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_HEADER'; payload: Partial<TemplateState['header']> }
  | { type: 'SET_FOOTER'; payload: Partial<TemplateState['footer']> }
  | { type: 'SET_AUTH'; payload: Partial<TemplateState['auth']> }
  | { type: 'SET_BUTTONS'; payload: TemplateButton[] }
  | { type: 'SET_CAROUSEL_CARDS'; payload: CarouselCard[] }
  | { type: 'SET_SAMPLES'; payload: Record<string, string> }
  | { type: 'LOAD_TEMPLATE'; payload: TemplateState }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' };

function getStepCount(state: TemplateState): number {
  if (state.category === 'AUTHENTICATION') return 5;
  return 7;
}

function reducer(state: TemplateState, action: Action): TemplateState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_HEADER':
      return { ...state, header: { ...state.header, ...action.payload } };
    case 'SET_FOOTER':
      return { ...state, footer: { ...state.footer, ...action.payload } };
    case 'SET_AUTH':
      return { ...state, auth: { ...state.auth, ...action.payload } };
    case 'SET_BUTTONS':
      return { ...state, buttons: action.payload };
    case 'SET_CAROUSEL_CARDS':
      return { ...state, carouselCards: action.payload };
    case 'SET_SAMPLES':
      return { ...state, samples: action.payload };
    case 'LOAD_TEMPLATE':
      return { ...action.payload, currentStep: 0 };
    case 'GO_TO_STEP':
      return { ...state, currentStep: Math.max(0, Math.min(action.step, getStepCount(state) - 1)) };
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, getStepCount(state) - 1) };
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ---- Step definitions ----
export interface StepDef {
  key: string;
  title: string;
  description: string;
}

export function getSteps(state: TemplateState): StepDef[] {
  if (state.category === 'AUTHENTICATION') {
    return [
      { key: 'basic', title: 'Informações Básicas', description: 'Nome, idioma' },
      { key: 'body', title: 'Corpo (Auth)', description: 'Configuração OTP' },
      { key: 'buttons', title: 'Botão OTP', description: 'Tipo de botão' },
      { key: 'samples', title: 'Amostras', description: 'Valores de exemplo' },
      { key: 'review', title: 'Revisão', description: 'Validação e envio' },
    ];
  }
  return [
    { key: 'basic', title: 'Informações Básicas', description: 'Nome, categoria e idioma' },
    { key: 'header', title: 'Header (Opcional)', description: 'Cabeçalho do template' },
    { key: 'body', title: 'Corpo (Obrigatório)', description: 'Mensagem principal' },
    { key: 'footer', title: 'Footer (Opcional)', description: 'Rodapé e opt-out' },
    { key: 'buttons', title: 'Botões (Opcional)', description: 'Botões de ação' },
    { key: 'samples', title: 'Amostras', description: 'Exemplos para aprovação' },
    { key: 'review', title: 'Revisão', description: 'Validação e envio' },
  ];
}

// ---- Context ----
interface WizardContextValue {
  state: TemplateState;
  dispatch: React.Dispatch<Action>;
  steps: StepDef[];
  stepCount: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const steps = getSteps(state);
  const stepCount = steps.length;

  const nextStep = useCallback(() => dispatch({ type: 'NEXT_STEP' }), []);
  const prevStep = useCallback(() => dispatch({ type: 'PREV_STEP' }), []);
  const goToStep = useCallback((step: number) => dispatch({ type: 'GO_TO_STEP', step }), []);

  return (
    <WizardContext.Provider value={{ state, dispatch, steps, stepCount, nextStep, prevStep, goToStep }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useTemplateWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useTemplateWizard must be used within WizardProvider');
  return ctx;
}
