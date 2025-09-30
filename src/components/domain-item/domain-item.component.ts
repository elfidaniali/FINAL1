import { Component, ChangeDetectionStrategy, input, output, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Domain } from '../../models/domain.model';

@Component({
  selector: 'app-domain-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './domain-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainItemComponent {
  domain = input.required<Domain>();

  check = output<Domain>();
  remove = output<number>();
  getSuggestions = output<Domain>();
  toggleEdit = output<Domain>();
  save = output<Partial<Domain> & { id: number }>();
  toggleNotes = output<Domain>();

  editedUrl = signal('');
  editedNotes = signal('');

  constructor() {
    effect(() => {
      this.editedUrl.set(this.domain().url);
      this.editedNotes.set(this.domain().notes || '');
    });
  }

  uptimePercentage = computed(() => {
    const history = this.domain().history;
    if (!history || history.length === 0) {
      return null;
    }
    const healthyChecks = history.filter(h => h.status === 'healthy').length;
    return ((healthyChecks / history.length) * 100).toFixed(1);
  });

  get statusClasses(): string {
    const d = this.domain();
    if (d.checking) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
    switch (d.status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'down':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'flagged':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  get statusText(): string {
    const d = this.domain();
    if (d.checking) {
      return 'Checking...';
    }
    return d.status.charAt(0).toUpperCase() + d.status.slice(1);
  }

  onSave() {
    this.save.emit({
      id: this.domain().id,
      url: this.editedUrl().trim(),
      notes: this.editedNotes().trim(),
    });
  }
}
