/**
 * Timezone options for signup: U.S., Canada, and Mexico only.
 * IANA time zone identifiers with friendly labels.
 */
export const SIGNUP_TIMEZONES: { value: string; label: string; region: "US" | "Canada" | "Mexico" }[] = [
  // United States
  { value: "America/New_York", label: "Eastern (New York)", region: "US" },
  { value: "America/Chicago", label: "Central (Chicago)", region: "US" },
  { value: "America/Denver", label: "Mountain (Denver)", region: "US" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)", region: "US" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)", region: "US" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)", region: "US" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)", region: "US" },
  // Canada
  { value: "America/St_Johns", label: "Newfoundland (St. John's)", region: "Canada" },
  { value: "America/Halifax", label: "Atlantic (Halifax)", region: "Canada" },
  { value: "America/Toronto", label: "Eastern (Toronto)", region: "Canada" },
  { value: "America/Winnipeg", label: "Central (Winnipeg)", region: "Canada" },
  { value: "America/Edmonton", label: "Mountain (Edmonton)", region: "Canada" },
  { value: "America/Vancouver", label: "Pacific (Vancouver)", region: "Canada" },
  // Mexico
  { value: "America/Mexico_City", label: "Central Mexico (Ciudad de México)", region: "Mexico" },
  { value: "America/Cancun", label: "Eastern Mexico (Cancún)", region: "Mexico" },
  { value: "America/Mazatlan", label: "Mountain Mexico (Mazatlán)", region: "Mexico" },
  { value: "America/Tijuana", label: "Pacific Mexico (Tijuana)", region: "Mexico" },
]

export const DEFAULT_SIGNUP_TIMEZONE = "America/New_York"
