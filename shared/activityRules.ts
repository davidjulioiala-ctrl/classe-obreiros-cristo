export type ActivityRuleInput = {
  type?: string | null;
  isReligious?: boolean | null;
  biblicalReference?: string | null;
  meetingAgenda?: string | null;
  meetingReason?: string | null;
};

export type ActivityRuleResult = {
  normalizedType: string;
  isSocial: boolean;
  isMeeting: boolean;
  isReligious: boolean;
  biblicalReference?: string;
  meetingAgenda?: string;
  meetingReason?: string;
};

const normalizeType = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

export function applyActivityTypeRules(input: ActivityRuleInput): ActivityRuleResult {
  const normalizedType = normalizeType(input.type);
  const isSocial = normalizedType === "social";
  const isMeeting = normalizedType === "reunião" || normalizedType === "reuniao";
  const isReligious = isSocial ? false : Boolean(input.isReligious);
  const meetingAgenda = input.meetingAgenda?.trim() || undefined;
  const meetingReason = input.meetingReason?.trim() || undefined;

  if (isMeeting && (!meetingAgenda || !meetingReason)) {
    throw new Error("Indique os pontos da ordem do dia e o motivo da reunião.");
  }

  return {
    normalizedType,
    isSocial,
    isMeeting,
    isReligious,
    biblicalReference: isReligious ? input.biblicalReference?.trim() || undefined : undefined,
    meetingAgenda: isMeeting ? meetingAgenda : undefined,
    meetingReason: isMeeting ? meetingReason : undefined,
  };
}
