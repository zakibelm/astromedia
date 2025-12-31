// tests/unit/AnalyticsDashboard.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';
import { AnalyticsOutput } from '../../services/agentSchemas';
import { TranslationProvider } from '../../i18n/TranslationContext';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<TranslationProvider>{component}</TranslationProvider>);
};

describe('AnalyticsDashboard', () => {
  const mockData: AnalyticsOutput = {
    kpis: [
      { kpi: 'CTR', value: 5.2, target: 4.5, status: 'above' },
      { kpi: 'ROAS', value: 3.8, target: 4.0, status: 'below' },
      { kpi: 'Engagement', value: 12, target: 12, status: 'on_track' },
    ],
    insights: [
      'Les visuels avec des humains ont un CTR 15% plus élevé.',
      'Le ROAS est plus faible sur la plateforme X.',
    ],
    recommendations: [
      { action: 'Augmenter le budget sur la plateforme Y.', priority: 2 },
      { action: 'Lancer une campagne de retargeting.', priority: 1 },
    ],
  };

  it('affiche un état d\'attente lorsque les données sont null', () => {
    renderWithProviders(<AnalyticsDashboard data={null} />);
    expect(screen.getByText(/En attente des données.../i)).toBeInTheDocument();
  });

  it('affiche les KPIs correctement lorsque les données sont fournies', () => {
    renderWithProviders(<AnalyticsDashboard data={mockData} />);
    expect(screen.getByText('CTR')).toBeInTheDocument();
    expect(screen.getByText('5.2')).toBeInTheDocument();
    expect(screen.getByText(/Dépasse les attentes/i)).toBeInTheDocument();

    expect(screen.getByText('ROAS')).toBeInTheDocument();
    expect(screen.getByText('3.8')).toBeInTheDocument();
    expect(screen.getByText(/En dessous des attentes/i)).toBeInTheDocument();
  });

  it('affiche les insights stratégiques', () => {
    renderWithProviders(<AnalyticsDashboard data={mockData} />);
    expect(screen.getByText(/Les visuels avec des humains ont un CTR 15% plus élevé./i)).toBeInTheDocument();
  });

  it('affiche les recommandations triées par priorité', () => {
    renderWithProviders(<AnalyticsDashboard data={mockData} />);
    const recommendations = screen.getAllByText(/Priorité/i);
    
    // Le premier élément doit être la priorité 1
    expect(recommendations[0].textContent).toContain('Priorité 1');
    expect(recommendations[0].nextElementSibling?.textContent).toBe('Lancer une campagne de retargeting.');
    
    // Le second élément doit être la priorité 2
    expect(recommendations[1].textContent).toContain('Priorité 2');
    expect(recommendations[1].nextElementSibling?.textContent).toBe('Augmenter le budget sur la plateforme Y.');
  });
});
