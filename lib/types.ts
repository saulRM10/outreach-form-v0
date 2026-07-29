// A contact resolved from Form_Lists: name + address kept separate,
export interface Contact {
  id: string;
  name: string;
  address: string;
  label: string; // "Name - Address"
}

export interface ListData {
  contacts: Contact[];
  campaigns: string[];
  leads: string[];
  methods: string[];
  responses: string[];
  saferCategories: string[]; // Outreach categories
  staff: string[];
}

export interface SubmissionPayload {
  contactId: string; // <- add: written to column M
  contactName: string; // -> column B
  streetAddress: string; // -> column K
  campaignName: string;
  outreachLead: string;
  outreachMethod: string;
  dateOfOutreach: string; // MM/DD/YY
  response: string;
  notes: string;
  followUpRequired: boolean; // mapped from Yes/No
  followUpDate: string; // MM/DD/YY or "" when no follow-up
  saferCategories: string[]; // Outreach categories
  otherStaff: string[]; // <- add: written to column N (joined)
}
