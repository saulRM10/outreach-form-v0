// A contact resolved from Form_Lists: name + address kept separate,
// plus a combined label shown in the picker for context.
export interface Contact {
  name: string;
  address: string;
  label: string; // "Name - Address" (or just name if no address)
}

export interface ListData {
  contacts: Contact[];
  campaigns: string[];
  leads: string[];
  methods: string[];
  responses: string[];
}

export interface SubmissionPayload {
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
}
