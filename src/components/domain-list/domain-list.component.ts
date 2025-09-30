import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Domain } from '../../models/domain.model';
import { DomainItemComponent } from '../domain-item/domain-item.component';

@Component({
  selector: 'app-domain-list',
  standalone: true,
  imports: [CommonModule, DomainItemComponent],
  templateUrl: './domain-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainListComponent {
  domains = input.required<Domain[]>();

  checkDomain = output<Domain>();
  removeDomain = output<number>();
  getSuggestions = output<Domain>();
  toggleEdit = output<Domain>();
  saveDomain = output<Partial<Domain> & { id: number }>();
  toggleNotes = output<Domain>();

  onCheckDomain(domain: Domain) {
    this.checkDomain.emit(domain);
  }

  onRemoveDomain(id: number) {
    this.removeDomain.emit(id);
  }

  onGetSuggestions(domain: Domain) {
    this.getSuggestions.emit(domain);
  }

  onToggleEdit(domain: Domain) {
    this.toggleEdit.emit(domain);
  }

  onSaveDomain(domain: Partial<Domain> & { id: number }) {
    this.saveDomain.emit(domain);
  }

  onToggleNotes(domain: Domain) {
    this.toggleNotes.emit(domain);
  }
}
