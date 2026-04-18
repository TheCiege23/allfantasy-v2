// app/api/start-sit/weather/route.js
// GET /api/start-sit/weather?sport=nfl

import { NextResponse } from "next/server";
import { VENUE_COORDS, timedFetch, getDemoWeather } from "@/lib/startSit/shared";

const OWM_KEY = process.env.OPENWEATHERMAP_KEY;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport") ?? "nfl";

  // Indoor or non-applicable sports
  if (!["nfl", "cfb", "mlb"].includes(sport)) {
    return NextResponse.json({ weather: [
      { game:"N/A", venue:"Indoor / Not applicable", temp:"—", wind:"—", precip:"—", icon:"🏟", impact:"None", impactColor:"#00d4aa" },
    ]});
  }

  if (!OWM_KEY) {
    return NextResponse.json({ weather: getDemoWeather() });
  }

  const outdoorVenues = Object.entries(VENUE_COORDS)
    .filter(([, v]) => !v.indoor)
    .slice(0, 5);

  const results = await Promise.all(
    outdoorVenues.map(async ([team, venue]) => {
      try {
        const data = await timedFetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${venue.lat}&lon=${venue.lon}&appid=${OWM_KEY}&units=imperial`
        );
        const temp     = Math.round(data.main?.temp ?? 65);
        const windMph  = Math.round((data.wind?.speed ?? 0));
        const precip   = Math.round((data.rain?.["1h"] ?? 0) * 100);
        const isCold   = temp < 35;
        const isHot    = temp > 92;
        const isWindy  = windMph > 15;
        const impact   = (isCold && isWindy) ? "High" : (isCold || isWindy || isHot) ? "Moderate" : "Low";
        const impactColor = impact === "High" ? "#f06060" : impact === "Moderate" ? "#f5a623" : "#00d4aa";
        const sky      = data.weather?.[0]?.main ?? "Clear";
        const icon     = sky === "Snow" ? "🌨" : sky === "Rain" || sky === "Drizzle" ? "🌧" : sky === "Thunderstorm" ? "⛈" : isCold ? "🥶" : isHot ? "🌞" : "⛅";

        return {
          game:  `${team} home`,
          venue: venue.name,
          temp:  `${temp}°F`,
          wind:  `${windMph}mph`,
          precip:`${precip}%`,
          icon,
          impact,
          impactColor,
        };
      } catch {
        return null;
      }
    })
  );

  const valid = results.filter(Boolean);
  return NextResponse.json(
    { weather: valid.length > 0 ? valid : getDemoWeather() },
    { headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" } }
  );
}
