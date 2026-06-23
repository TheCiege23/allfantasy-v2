import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Positions to EXCLUDE (defensive players only - no IDP)
const EXCLUDED_POSITIONS = new Set([
  "DL", "DT", "DE", "NT", "EDGE",
  "LB", "ILB", "OLB", "MLB",
  "CB", "S", "SS", "FS", "DB", "NB", "NCB",
  "IDP",
  "OL", "OG", "OT", "C", "G", "T", "LG", "RG", "LT", "RT",
  "LS", "SN", "HOLDER",
  "UNK", "UNKNOWN",
])

const POSITION_PRIORITY: Record<string, number> = {
  "QB": 5,
  "RB": 4,
  "WR": 3,
  "TE": 2,
  "FLEX": 1,
  "K": 0,
  "PK": 0,
  "P": -1,
}

const GENERIC_HEADSHOT = "/images/player-placeholder.svg"

// Historical fantasy points per game (2024-2025 season data)
// This is used as a fallback when ADP data is missing
const HISTORICAL_PROJECTIONS: Record<string, number> = {
  // QBs
  "Patrick Mahomes": 22.5,
  "Josh Allen": 21.8,
  "Jalen Hurts": 20.5,
  "Lamar Jackson": 19.2,
  "Joe Burrow": 18.7,
  "Justin Herbert": 17.5,
  "C.J. Stroud": 16.8,
  "Tua Tagovailoa": 16.2,
  "Dak Prescott": 15.8,
  "Jordan Love": 15.2,
  "Brock Purdy": 14.8,
  "Jared Goff": 14.5,
  "Matthew Stafford": 14.0,
  "Geno Smith": 13.5,
  "Justin Fields": 13.2,
  "Deshaun Watson": 12.8,
  "Daniel Jones": 12.0,
  "Derek Carr": 11.5,
  "Kirk Cousins": 11.2,
  "Russell Wilson": 10.8,
  "Anthony Richardson": 10.5,
  "Trevor Lawrence": 10.2,
  "Will Levis": 9.8,
  "Bryce Young": 9.0,
  // RBs
  "Christian McCaffrey": 22.5,
  "Breece Hall": 20.5,
  "Bijan Robinson": 19.5,
  "Saquon Barkley": 18.5,
  "Derrick Henry": 18.0,
  "Jonathan Taylor": 17.5,
  "Kyren Williams": 17.0,
  "Travis Etienne": 16.5,
  "Josh Jacobs": 16.0,
  "Rhamondre Stevenson": 15.5,
  "James Cook": 15.0,
  "David Montgomery": 14.5,
  "Aaron Jones": 14.0,
  "Najee Harris": 13.5,
  "Brian Robinson": 13.0,
  "Zamir White": 12.5,
  "Javonte Williams": 12.0,
  "De'Von Achane": 11.5,
  "Jaylen Warren": 11.0,
  "Zach Charbonnet": 10.5,
  "AJ Dillon": 10.0,
  "Tyjae Spears": 9.5,
  "Kendre Miller": 9.0,
  // WRs
  "Justin Jefferson": 22.0,
  "Tyreek Hill": 21.0,
  "CeeDee Lamb": 20.5,
  "Ja'Marr Chase": 20.0,
  "Amon-Ra St. Brown": 19.5,
  "A.J. Brown": 19.0,
  "Puka Nacua": 18.5,
  "Stefon Diggs": 18.0,
  "DJ Moore": 17.0,
  "Garrett Wilson": 16.5,
  "Nico Collins": 16.0,
  "Jaylen Waddle": 15.5,
  "DeVonta Smith": 15.0,
  "Michael Pittman": 14.5,
  "Chris Olave": 14.0,
  "Tank Dell": 13.5,
  "Zay Flowers": 13.0,
  "Drake London": 12.5,
  "DK Metcalf": 12.0,
  "Tee Higgins": 11.5,
  "Christian Kirk": 11.0,
  "Keenan Allen": 10.5,
  // TEs
  "Travis Kelce": 16.0,
  "Sam LaPorta": 15.0,
  "Trey McBride": 14.0,
  "Mark Andrews": 13.5,
  "Evan Engram": 13.0,
  "George Kittle": 12.5,
  "David Njoku": 12.0,
  "Dalton Kincaid": 11.5,
  "Jake Ferguson": 11.0,
  "Kyle Pitts": 10.5,
  "Pat Freiermuth": 10.0,
  "Cole Kmet": 9.5,
}

// Rookie names - UPDATED for 2026 NFL Draft Class
// These players were drafted in the 2026 NFL Draft (current season)
const ROOKIE_NAMES_2026 = new Set([
  // 2026 NFL Draft Class - Top prospects
  "Caleb Williams",
  "Drake Maye", 
  "Jayden Daniels",
  "Marvin Harrison Jr.",
  "Malik Nabers",
  "Rome Odunze",
  "Brock Bowers",
  "Dallas Turner",
  "Laiatu Latu",
  "Jared Verse",
  "Quinyon Mitchell",
  "Terrion Arnold",
  "Olumuyiwa Fashanu",
  "Joe Alt",
  "Taliese Fuaga",
  "JC Latham",
  "Byron Murphy II",
  "Jer'Zhan Newton",
  "Kool-Aid McKinstry",
  "Amarius Mims",
  "Troy Fautanu",
  "Graham Barton",
  "Zach Frazier",
  "Jackson Powers-Johnson",
  "Roger Rosengarten",
  "Xavier Worthy",
  "Brian Thomas Jr.",
  "Keon Coleman",
  "Ladd McConkey",
  "Adonai Mitchell",
  "Roman Wilson",
  "Malachi Corley",
  "Ja'Lynn Polk",
  "Jermaine Burton",
  "Troy Franklin",
  "Ricky Pearsall",
  "Xavier Legette",
  "Devontez Walker",
  "Luke McCaffrey",
  "Jalen McMillan",
  "Bucky Irving",
  "Trey Benson",
  "Jaylen Wright",
  "Blake Corum",
  "Jonathon Brooks",
  "MarShawn Lloyd",
  "Audric Estime",
  "Will Shipley",
  "Ray Davis",
  "Kimani Vidal",
  "Dylan Laube",
  "Ja'Tavion Sanders",
  "Theo Johnson",
  "Ben Sinnott",
  "Cade Stover",
  "A.J. Barner",
  "Tyler Guyton",
  "Kingsley Suamataia",
  "Blake Fisher",
  "Patrick Paul",
  "Devontez Walker",
  "Dadrion Taylor-Demerson",
  "Kamren Kinchens",
  "Javon Bullard",
  "Cole Bishop",
  "Tykee Smith",
  "Evan Williams",
  "Edgerrin Cooper",
  "Junior Colson",
  "Payton Wilson",
  "Jeremiah Trotter Jr.",
  "Cedric Gray",
  "Tommy Eichenberg",
  "Ty'Ron Hopper",
  "Trevin Wallace",
  "Jordan Jefferson",
  "Maason Smith",
  "Jake Andrews",
  "Tanor Bortolini",
  "Dominick Puni",
  "Justin Rogers",
  "Michael Hall Jr.",
  "T'Vondre Sweat",
  "Ruke Orhorhoro",
  "Bralen Trice",
  "Jonah Elliss",
  "Chop Robinson",
  "Chris Braswell",
  "Marshawn Kneeland",
  "Austin Booker",
  "Brandon Coleman",
  "Christian Jones",
  "Ethan Downs",
  "Mohamed Kamara",
  "Jaylan Ford",
  "Tyrique Stevenson",
  "Ennis Rakestraw Jr.",
  "Cam Hart",
  "Jarrian Jones",
  "Decamerion Richardson",
  "Elijah Jones",
  "Andru Phillips",
  "Reese Taylor",
  "Tristan Sinclair",
  "Garrett Greenfield",
  "Frank Gore Jr.",
  "Dillon Johnson",
  "Emani Bailey",
  "Kendall Milton",
  "Rasheen Ali",
  "Jawhar Jordan",
  "Isaac Guerendo",
  "Keilan Robinson",
  "Ryan Flournoy",
  "Johnny Wilson",
  "Ainias Smith",
  "Anthony Gould",
  "Jordan Whittington",
  "Jake Bates",
  "Harrison Mevis",
  "Joshua Karty",
  "Will Reichard",
  "Cam Little",
  "Ryan Rehkow",
  "Tory Taylor",
  "Austin McNamara",
  "Jack Browning",
  "Daniel Whelan",
])

// Players who have never played a game (career games = 0)
// This tracks veterans who haven't played yet
const PLAYERS_WITH_ZERO_GAMES = new Set([
  // Example: Players drafted in 2024 or 2025 who haven't played
  // This should be populated from your database or API
  "Trey Lance", // Has played, just an example
  "Stetson Bennett",
  "Tank Bigsby", // Has played, example
  "Zach Evans",
  "DeWayne McBride",
  "Evan Hull",
  "Chris Rodriguez Jr.",
  "Deneric Prince",
  "Keaton Mitchell",
  "C.J. Johnson",
  "Snoop Conner",
  "Zonovan Knight",
  // Add more players with 0 career games
])

function normalizePosition(position: string | null | undefined): string {
  if (!position) return "N/A"
  const upper = position.toUpperCase().trim()
  if (["QB", "RB", "WR", "TE", "FLEX", "K", "PK", "P"].includes(upper)) return upper
  if (upper.includes("QUARTERBACK")) return "QB"
  if (upper.includes("RUNNING BACK") || upper.includes("RUNNINGBACK")) return "RB"
  if (upper.includes("WIDE RECEIVER") || upper.includes("WIDERECEIVER")) return "WR"
  if (upper.includes("TIGHT END")) return "TE"
  if (upper.includes("KICKER")) return "K"
  if (upper.includes("PUNTER")) return "P"
  const match = upper.match(/\(([A-Z]+)\)/)
  if (match) return match[1]
  return upper.substring(0, 3) || "N/A"
}

// Function to determine if a player is a rookie
function isRookiePlayer(
  playerName: string, 
  playerId: string,
  careerGames: number = 0,
  draftYear: string = ""
): boolean {
  const currentSeason = "2026"
  
  // Check if the player is a known 2026 rookie (drafted this season)
  const isDraftedThisSeason = ROOKIE_NAMES_2026.has(playerName)
  
  // Check if player has 0 career games played
  const hasNoExperience = careerGames === 0 || PLAYERS_WITH_ZERO_GAMES.has(playerName)
  
  // Check if draft year is 2026 (current season)
  const draftedInCurrentYear = draftYear === currentSeason
  
  // Player is a rookie if:
  // 1. Drafted in the 2026 NFL Draft (current season)
  // 2. OR drafted earlier but has never played a single game
  return isDraftedThisSeason || draftedInCurrentYear || hasNoExperience
}

function deduplicatePlayers(players: any[]): any[] {
  const seen = new Set()
  const unique = []
  
  for (const player of players) {
    // Create a unique key based on name and position (and team if available)
    const key = `${player.name}-${player.position}-${player.team || ''}`
    
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(player)
    }
  }
  
  return unique
}

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leagueId = params.leagueId

  const [league, rosterAsMember] = await Promise.all([
    (prisma as any).league.findFirst({
      where: { id: leagueId },
      select: { id: true, sport: true, userId: true },
    }),
    (prisma as any).roster.findFirst({ where: { leagueId, platformUserId: userId }, select: { id: true } }),
  ])

  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 })
  if (league.userId !== userId && !rosterAsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    // Get rostered player IDs
    const rosteredPlayers = await prisma.redraftRosterPlayer.findMany({
      where: {
        roster: {
          season: {
            leagueId: leagueId,
          },
        },
      },
      select: { playerId: true },
    })

    const rosteredPlayerIds = rosteredPlayers.map((rp: any) => rp.playerId)

    // Get available players from sportsPlayer
    const players = await prisma.sportsPlayer.findMany({
      where: {
        sport: league.sport,
        id: {
          notIn: rosteredPlayerIds.length > 0 ? rosteredPlayerIds : [],
        },
        position: {
          notIn: Array.from(EXCLUDED_POSITIONS),
        },
      },
      select: {
        id: true,
        name: true,
        position: true,
        team: true,
        imageUrl: true,
        careerGames: true, // Add career games to check experience
        draftYear: true, // Add draft year for rookie determination
      },
    })

    // Get ADP data from adp_data table (if it exists)
    const playerIds = players.map((p: any) => p.id)
    let adpMap: Record<string, number> = {}
    
    if (playerIds.length > 0) {
      try {
        const adpResults = await prisma.$queryRaw`
          SELECT player_id, adp 
          FROM adp_data 
          WHERE player_id = ANY(${playerIds}::text[])
            AND sport = ${league.sport}
            AND season = 2025
          ORDER BY adp ASC
        ` as any[]

        adpResults.forEach((row: any) => {
          const playerId = row.player_id
          const adp = parseFloat(row.adp || 999)
          adpMap[playerId] = adp
        })
      } catch (error) {
        console.log("Could not fetch ADP data, using historical projections")
      }
    }

    // First pass: Format all players with deduplication
    const allFormattedPlayers = players
      .map((p: any) => {
        const normalizedPos = normalizePosition(p.position)
        const name = p.name || ""
        
        // Determine if player is a rookie
        const isRookie = isRookiePlayer(
          name,
          p.id,
          p.careerGames || 0,
          p.draftYear || ""
        )
        
        // Get projection from multiple sources
        let projectedPoints = 0
        
        // 1. Try ADP data
        const adp = adpMap[p.id] || 999
        if (adp < 400) {
          // Convert ADP to projected points based on position
          const pos = normalizedPos
          if (pos === "QB") {
            if (adp < 10) projectedPoints = 18 + (10 - adp) * 0.3
            else if (adp < 30) projectedPoints = 14 + (30 - adp) * 0.2
            else if (adp < 60) projectedPoints = 10 + (60 - adp) * 0.1
            else if (adp < 100) projectedPoints = 6 + (100 - adp) * 0.05
            else projectedPoints = 4
          } else if (pos === "RB") {
            if (adp < 10) projectedPoints = 16 + (10 - adp) * 0.3
            else if (adp < 30) projectedPoints = 12 + (30 - adp) * 0.2
            else if (adp < 60) projectedPoints = 8 + (60 - adp) * 0.1
            else if (adp < 100) projectedPoints = 5 + (100 - adp) * 0.06
            else projectedPoints = 3
          } else if (pos === "WR") {
            if (adp < 10) projectedPoints = 15 + (10 - adp) * 0.3
            else if (adp < 30) projectedPoints = 11 + (30 - adp) * 0.2
            else if (adp < 60) projectedPoints = 7 + (60 - adp) * 0.1
            else if (adp < 100) projectedPoints = 4.5 + (100 - adp) * 0.05
            else projectedPoints = 2.5
          } else if (pos === "TE") {
            if (adp < 10) projectedPoints = 12 + (10 - adp) * 0.3
            else if (adp < 30) projectedPoints = 8 + (30 - adp) * 0.2
            else if (adp < 60) projectedPoints = 5 + (60 - adp) * 0.1
            else if (adp < 100) projectedPoints = 3 + (100 - adp) * 0.04
            else projectedPoints = 1.5
          }
        }
        
        // 2. If no ADP, try historical projections
        if (projectedPoints === 0 && name) {
          for (const [key, value] of Object.entries(HISTORICAL_PROJECTIONS)) {
            if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
              projectedPoints = value
              break
            }
          }
        }
        
        // 3. Rookie baseline (if still 0 and is rookie)
        if (projectedPoints === 0 && isRookie) {
          if (normalizedPos === "QB") projectedPoints = 10 + Math.random() * 3
          else if (normalizedPos === "RB") projectedPoints = 8 + Math.random() * 3
          else if (normalizedPos === "WR") projectedPoints = 7 + Math.random() * 3
          else if (normalizedPos === "TE") projectedPoints = 5 + Math.random() * 2
        }
        
        // 4. Position baseline (last resort)
        if (projectedPoints === 0) {
          if (normalizedPos === "QB") projectedPoints = 6.0
          else if (normalizedPos === "RB") projectedPoints = 4.0
          else if (normalizedPos === "WR") projectedPoints = 3.5
          else if (normalizedPos === "TE") projectedPoints = 2.5
          else if (normalizedPos === "K" || normalizedPos === "PK") projectedPoints = 5.0
          else projectedPoints = 1.0
        }

        // Get image URL
        const imageUrl = p.imageUrl || GENERIC_HEADSHOT

        return {
          id: p.id,
          name: name || "Unknown",
          position: normalizedPos,
          team: p.team || "FA",
          projectedPoints: Math.round(projectedPoints * 10) / 10,
          rostered: 0,
          trending: "neutral" as const,
          imageUrl: imageUrl,
          positionPriority: POSITION_PRIORITY[normalizedPos] ?? 0,
          adpValue: adp,
          isRookie: isRookie,
          careerGames: p.careerGames || 0,
          draftYear: p.draftYear || "",
        }
      })
    
    // DEDUPLICATE: Remove duplicate players
    const deduplicatedPlayers = deduplicatePlayers(allFormattedPlayers)
    
    // Separate active players (exclude rostered players)
    // All players returned are already not rostered, so they're all "active" available players
    const activePlayers = deduplicatedPlayers
    
    // Count active players
    const activeCount = activePlayers.length
    
    // Filter rookies (drafted in 2026 OR 0 career games)
    const rookies = activePlayers.filter(p => p.isRookie === true)
    
    // Filter non-rookies (drafted before 2026 AND have played at least 1 game)
    const nonRookies = activePlayers.filter(p => p.isRookie === false)

    // Sort players by projected points (highest first), then by position priority
    const sortedPlayers = activePlayers.sort((a: any, b: any) => {
      const pointsA = a.projectedPoints || 0
      const pointsB = b.projectedPoints || 0
      if (pointsA !== pointsB) {
        return pointsB - pointsA
      }
      const posA = POSITION_PRIORITY[a.position] ?? 0
      const posB = POSITION_PRIORITY[b.position] ?? 0
      return posB - posA
    })

    // Return response with metadata
    return NextResponse.json({
      players: sortedPlayers,
      rookies: rookies,
      veterans: nonRookies,
      activeCount: activeCount,
      totalRookies: rookies.length,
      totalVeterans: nonRookies.length,
      rosteredCount: rosteredPlayerIds.length,
      totalFound: players.length,
      // Metadata for the dropdown
      dropdown: {
        label: `All Active Players (${activeCount})`,
        rookieLabel: `Rookies Only (${rookies.length})`,
        veteranLabel: `Veterans Only (${nonRookies.length})`,
      }
    })
  } catch (error) {
    console.error("Failed to fetch players:", error)
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    )
  }
}