/**
 * Utility functions for F1-related images
 * These can be replaced with actual API image URLs when available
 */

/**
 * Get team color for driver avatar background
 * Maps team names to their brand colors
 * Handles both short names (e.g., "McLaren") and full API names (e.g., "McLaren Formula 1 Team")
 *
 * Future compatibility: If new team name variations appear, add them to `teamNameMappings`.
 * The normalization function automatically handles common prefixes/suffixes, and fuzzy matching
 * provides fallback for minor variations. For completely new teams, add them to `teamColors`.
 */
export function getTeamColor(teamName: string): string {
  // Normalize team name by extracting the main team name
  // Removes common prefixes and suffixes
  const normalize = (name: string): string => {
    return (
      name
        // Remove common prefixes
        .replace(/^Scuderia\s+/i, "") // "Scuderia Ferrari" -> "Ferrari"
        // Remove common suffixes
        .replace(/\s+Formula\s+1\s+Team.*$/i, "") // "McLaren Formula 1 Team" -> "McLaren"
        .replace(/\s+F1\s+Team.*$/i, "") // "RB F1 Team" -> "RB"
        .replace(/\s+Racing.*$/i, "") // "Williams Racing" -> "Williams"
        .replace(/\s+Team.*$/i, "") // "Haas F1 Team" -> "Haas"
        .trim()
    );
  };

  const normalized = normalize(teamName);

  // Special mappings for teams with name changes or variations
  // This handles historical name changes and ensures future compatibility
  const teamNameMappings: Record<string, string> = {
    // Alfa Romeo variations
    Stake: "Alfa Romeo",
    "Stake F1": "Alfa Romeo",
    Sauber: "Alfa Romeo",
    "Sauber F1": "Alfa Romeo",
    // AlphaTauri/RB variations
    RB: "AlphaTauri",
    "RB F1": "AlphaTauri",
    // Ferrari variations
    "Scuderia Ferrari": "Ferrari",
    Ferrari: "Ferrari",
    // Red Bull variations
    "Red Bull Racing": "Red Bull Racing",
    "Red Bull": "Red Bull Racing",
  };

  // Apply name mappings first (check both original and normalized)
  const mappedName =
    teamNameMappings[teamName] || teamNameMappings[normalized] || normalized;

  // Core team colors - these are the canonical team names
  const teamColors: Record<string, string> = {
    "Red Bull Racing": "1E41FF", // Red Bull blue
    Ferrari: "DC143C", // Ferrari red
    Mercedes: "00D2BE", // Mercedes teal
    McLaren: "FF8700", // McLaren orange
    "Aston Martin": "00665E", // Aston Martin green
    Alpine: "0090FF", // Alpine blue
    Williams: "005AFF", // Williams blue
    AlphaTauri: "2B4562", // AlphaTauri navy
    "Alfa Romeo": "900000", // Alfa Romeo red
    Haas: "FFFFFF", // Haas white (will use gray for contrast)
  };

  // Try mapped name first
  if (teamColors[mappedName]) {
    return teamColors[mappedName];
  }

  // Try normalized name
  if (teamColors[normalized]) {
    return teamColors[normalized];
  }

  // Try exact match
  if (teamColors[teamName]) {
    return teamColors[teamName];
  }

  // Try case-insensitive fuzzy matching
  const lowerMapped = mappedName.toLowerCase();
  const lowerNormalized = normalized.toLowerCase();
  const lowerOriginal = teamName.toLowerCase();

  for (const [key, value] of Object.entries(teamColors)) {
    const lowerKey = key.toLowerCase();
    // Check if any part matches (for compound names)
    if (
      lowerKey === lowerMapped ||
      lowerKey === lowerNormalized ||
      lowerKey === lowerOriginal ||
      lowerMapped.includes(lowerKey) ||
      lowerKey.includes(lowerMapped)
    ) {
      return value;
    }
  }

  return "6B7280"; // Default gray
}

/**
 * Get driver image URL
 * Uses team colors for better visual distinction since API doesn't provide images
 */
export function getDriverImageUrl(
  driverNumber: number,
  driverName?: string,
  teamName?: string
): string {
  // Use team color for background, driver number for initials
  const initials = driverName
    ? driverName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : driverNumber.toString();

  const bgColor = teamName ? getTeamColor(teamName) : "6B7280";
  const textColor = bgColor === "FFFFFF" ? "000000" : "FFFFFF";

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials
  )}&background=${bgColor}&color=${textColor}&size=128&bold=true&font-size=0.5`;
}

/**
 * Get team logo URL
 * Uses actual team logo from API if available, otherwise falls back to placeholder
 */
export function getTeamLogoUrl(teamName: string, teamLogo?: string): string {
  // Use actual team logo from API if available
  if (teamLogo) {
    return teamLogo;
  }
  // Fallback: Use a service or static team logos
  // In production, you could also use a CDN with team logos
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    teamName
  )}&background=random&size=64&bold=true`;
}

/**
 * Get circuit image URL
 * Placeholder for now - can be replaced with actual circuit images
 */
export function getCircuitImageUrl(circuitName: string): string {
  // Placeholder: Use a service or static circuit images
  // In production, replace with actual circuit images from F1 API or Wikipedia
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    circuitName
  )}&background=random&size=256`;
}

/**
 * Get country flag emoji from country name
 */
export function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    Bahrain: "🇧🇭",
    "Saudi Arabia": "🇸🇦",
    Australia: "🇦🇺",
    Japan: "🇯🇵",
    China: "🇨🇳",
    USA: "🇺🇸",
    "United States": "🇺🇸",
    Italy: "🇮🇹",
    Monaco: "🇲🇨",
    Canada: "🇨🇦",
    Spain: "🇪🇸",
    Austria: "🇦🇹",
    "Great Britain": "🇬🇧",
    Hungary: "🇭🇺",
    Belgium: "🇧🇪",
    Netherlands: "🇳🇱",
    Azerbaijan: "🇦🇿",
    Singapore: "🇸🇬",
    Mexico: "🇲🇽",
    Brazil: "🇧🇷",
    Qatar: "🇶🇦",
    UAE: "🇦🇪",
    "United Arab Emirates": "🇦🇪",
    France: "🇫🇷",
    Germany: "🇩🇪",
    Portugal: "🇵🇹",
    Russia: "🇷🇺",
    Turkey: "🇹🇷",
    Argentina: "🇦🇷",
    South: "🇿🇦",
    Africa: "🇿🇦",
  };
  return flags[country] || "🏁";
}
