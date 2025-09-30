import { Component, ChangeDetectionStrategy, signal, effect, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomainListComponent } from './components/domain-list/domain-list.component';
import { GeminiService } from './services/gemini.service';
import { Domain } from './models/domain.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DomainListComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GeminiService],
})
export class AppComponent implements OnDestroy {
  domains = signal<Domain[]>([]);
  newDomainUrl = signal('');
  errorMessage = signal<string | null>(null);
  isLoadingSuggestions = signal(false);
  autoRefreshInterval = signal(0); // in seconds, 0 is off
  private autoRefreshTimerId: number | null = null;

  private readonly MAX_HISTORY_LENGTH = 20;

  // Initial sample data
  private initialDomains: Domain[] = [
    { id: 1, url: 'google.com', status: 'pending', last_checked: null, history: [] },
    { id: 2, url: 'github.com', status: 'pending', last_checked: null, history: [] },
    { id: 3, url: 'this-domain-is-down.com', status: 'pending', last_checked: null, history: [] },
    { id: 4, url: 'angular.io', status: 'pending', last_checked: null, history: [] },
  ];

  constructor(private geminiService: GeminiService) {
    this.loadDomainsFromStorage();

    effect(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('domains', JSON.stringify(this.domains()));
      }
    });

    effect(() => {
      const interval = this.autoRefreshInterval();
      this.clearAutoRefresh();
      if (interval > 0) {
        this.autoRefreshTimerId = window.setInterval(() => {
          this.checkAllDomains();
        }, interval * 1000);
      }
    });
  }

  ngOnDestroy() {
    this.clearAutoRefresh();
  }
  
  private loadDomainsFromStorage() {
     if (typeof localStorage === 'undefined') {
        this.domains.set(this.initialDomains);
        return;
    }
    const savedDomains = localStorage.getItem('domains');
    let domainsToSet: Domain[];
    if (savedDomains) {
        domainsToSet = JSON.parse(savedDomains).map((d: any) => ({
            ...d,
            last_checked: d.last_checked ? new Date(d.last_checked) : null,
            history: d.history ? d.history.map((h: any) => ({...h, checkedAt: new Date(h.checkedAt)})) : [],
            isEditing: false,
            checking: false,
            showNotes: false,
        }));
    } else {
        domainsToSet = this.initialDomains;
    }
    this.domains.set(domainsToSet);
  }

  private clearAutoRefresh() {
    if (this.autoRefreshTimerId) {
      clearInterval(this.autoRefreshTimerId);
      this.autoRefreshTimerId = null;
    }
  }

  addDomain() {
    const url = this.newDomainUrl().trim();
    if (!url) {
      this.errorMessage.set('Domain URL cannot be empty.');
      return;
    }
    try {
      const formattedUrl = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      if (this.domains().some(d => d.url === formattedUrl)) {
        this.errorMessage.set('This domain is already in the list.');
        return;
      }
      const newDomain: Domain = {
        id: Date.now(),
        url: formattedUrl,
        status: 'pending',
        last_checked: null,
        history: [],
      };
      this.domains.update(d => [...d, newDomain]);
      this.newDomainUrl.set('');
      this.errorMessage.set(null);
    } catch (e) {
      this.errorMessage.set('Please enter a valid domain URL.');
    }
  }

  removeDomain(id: number) {
    this.domains.update(d => d.filter(domain => domain.id !== id));
  }

  checkDomain(domainToCheck: Domain) {
    this.domains.update(domains =>
      domains.map(d => (d.id === domainToCheck.id ? { ...d, checking: true, status: 'pending' } : d))
    );

    setTimeout(() => {
      const statuses: Array<'healthy' | 'down' | 'flagged'> = ['healthy', 'healthy', 'healthy', 'down', 'flagged'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      this.domains.update(domains =>
        domains.map(d => {
          if (d.id !== domainToCheck.id) return d;
          
          const newHistory = [{ status: randomStatus, checkedAt: new Date() }, ...(d.history || [])].slice(0, this.MAX_HISTORY_LENGTH);

          return { 
            ...d, 
            status: randomStatus, 
            last_checked: new Date(), 
            checking: false, 
            suggestions: undefined,
            history: newHistory,
          };
        })
      );
    }, 1500 + Math.random() * 1000);
  }

  checkAllDomains() {
    this.domains().forEach(d => {
        if (!d.checking) {
            this.checkDomain(d);
        }
    });
  }

  async getSuggestions(domainToHelp: Domain) {
    this.isLoadingSuggestions.set(true);
    this.domains.update(domains =>
      domains.map(d => (d.id === domainToHelp.id ? { ...d, suggestions: 'AI is thinking...' } : d))
    );

    try {
      const suggestions = await this.geminiService.getTroubleshootingSuggestions(domainToHelp.url, domainToHelp.status);
      this.domains.update(domains =>
        domains.map(d => (d.id === domainToHelp.id ? { ...d, suggestions } : d))
      );
    } catch (error) {
      console.error('Error getting suggestions:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      this.domains.update(domains =>
        domains.map(d => (d.id === domainToHelp.id ? { ...d, suggestions: `Error: ${errorMessage}` } : d))
      );
    } finally {
        this.isLoadingSuggestions.set(false);
    }
  }

  toggleEditDomain(domainToEdit: Domain) {
    this.domains.update(domains =>
      domains.map(d =>
        d.id === domainToEdit.id
          ? { ...d, isEditing: !d.isEditing }
          : { ...d, isEditing: false }
      )
    );
  }

  saveDomain(updatedData: Partial<Domain> & { id: number }) {
    this.domains.update(domains =>
      domains.map(d =>
        d.id === updatedData.id
          ? { ...d, url: updatedData.url!, notes: updatedData.notes!, isEditing: false }
          : d
      )
    );
  }

  toggleNotes(domainToToggle: Domain) {
     this.domains.update(domains =>
      domains.map(d =>
        d.id === domainToToggle.id ? { ...d, showNotes: !d.showNotes } : d
      )
    );
  }

  exportToCsv() {
    const domains = this.domains();
    if (domains.length === 0) return;

    const headers = ['ID', 'URL', 'Status', 'Uptime %', 'Last Checked', 'Notes'];
    const csvRows = [headers.join(',')];

    for (const domain of domains) {
        const healthyChecks = domain.history?.filter(h => h.status === 'healthy').length || 0;
        const totalChecks = domain.history?.length || 0;
        const uptime = totalChecks > 0 ? ((healthyChecks / totalChecks) * 100).toFixed(2) : 'N/A';

        const values = [
            domain.id,
            domain.url,
            domain.status,
            uptime,
            domain.last_checked ? new Date(domain.last_checked).toISOString() : 'N/A',
            domain.notes || ''
        ].map(v => `"${String(v).replace(/"/g, '""')}"`);
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'domain_health_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
