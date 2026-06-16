// Shape of the dropdown data the form hydrates from Form_Lists.
export interface ListData {
  contacts: string[];   // "Name - Address"
  campaigns: string[];
  leads: string[];
  methods: string[];
  responses: string[];
}

// Payload the client sends to /api/submit.
export interface SubmissionPayload {
  contact: string;
  campaignName: string;
  outreachLead: string;
  outreachMethod: string;
  dateOfOutreach: string;        // MM/DD/YY
  response: string;
  notes: string;
  followUpRequired: boolean;     // mapped from Yes/No
  followUpDate: string;          // MM/DD/YY or "" when no follow-up
}
