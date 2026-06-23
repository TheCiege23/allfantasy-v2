/* eslint-env node */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// TheSportsDB API configuration
const THESPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || "3"
const THESPORTSDB_BASE_URL = "https://www.thesportsdb.com/api/v1/json"

// API-Sports configuration
const APISPORTS_API_KEY = process.env.APISPORTS_API_KEY
const APISPORTS_BASE_URL = "https://v3.football.api-sports.io"

// NFL team name mapping for API-Sports
const NFL_TEAM_MAPPING: Record<string, string> = {
  "ARI": "Arizona Cardinals",
  "ATL": "Atlanta Falcons",
  "BAL": "Baltimore Ravens",
  "BUF": "Buffalo Bills",
  "CAR": "Carolina Panthers",
  "CHI": "Chicago Bears",
  "CIN": "Cincinnati Bengals",
  "CLE": "Cleveland Browns",
  "DAL": "Dallas Cowboys",
  "DEN": "Denver Broncos",
  "DET": "Detroit Lions",
  "GB": "Green Bay Packers",
  "HOU": "Houston Texans",
  "IND": "Indianapolis Colts",
  "JAX": "Jacksonville Jaguars",
  "KC": "Kansas City Chiefs",
  "LV": "Las Vegas Raiders",
  "LAC": "Los Angeles Chargers",
  "LAR": "Los Angeles Rams",
  "MIA": "Miami Dolphins",
  "MIN": "Minnesota Vikings",
  "NE": "New England Patriots",
  "NO": "New Orleans Saints",
  "NYG": "New York Giants",
  "NYJ": "New York Jets",
  "PHI": "Philadelphia Eagles",
  "PIT": "Pittsburgh Steelers",
  "SF": "San Francisco 49ers",
  "SEA": "Seattle Seahawks",
  "TB": "Tampa Bay Buccaneers",
  "TEN": "Tennessee Titans",
  "WAS": "Washington Commanders",
}

async function fetchFromTheSportsDB(playerName: string, team: string): Promise<string | null> {
  try {
    const cleanName = playerName
      .replace(/[^a-zA-Z\s\-\.']/g, "")
      .trim()
      .replace(/\s+/g, " ")
    
    const response = await fetch(
      `${THESPORTSDB_BASE_URL}/${THESPORTSDB_API_KEY}/searchplayers.php?p=${encodeURIComponent(cleanName)}`
    )
    
    if (!response.ok) return null
    
    const data = (await response.json()) as any
    
    if (data.player && data.player.length > 0) {
      const matchedPlayer = data.player.find((p: any) => {
        const nameMatch = p.strPlayer?.toLowerCase() === cleanName.toLowerCase()
        const teamMatch = p.strTeam?.toLowerCase() === team.toLowerCase() || 
                         p.strTeam2?.toLowerCase() === team.toLowerCase()
        return nameMatch && teamMatch
      }) || data.player[0]
      
      return matchedPlayer?.strCutout || matchedPlayer?.strThumb || matchedPlayer?.strRender || null
    }
    
    return null
  } catch (error) {
    console.error(`TheSportsDB error for ${playerName}:`, error)
    return null
  }
}

async function fetchFromAPISports(playerName: string, team: string): Promise<string | null> {
  if (!APISPORTS_API_KEY) return null

  try {
    const fullTeamName = NFL_TEAM_MAPPING[team] || team
    
    const response = await fetch(
      `${APISPORTS_BASE_URL}/players?search=${encodeURIComponent(playerName)}&team=${encodeURIComponent(fullTeamName)}`,
      {
        headers: {
          "x-apisports-key": APISPORTS_API_KEY,
        },
      }
    )
    
    if (!response.ok) return null
    
    const data = (await response.json()) as any
    
    if (data.response && data.response.length > 0) {
      const player = data.response.find((p: any) => {
        const nameMatch = p.player.name?.toLowerCase().includes(playerName.toLowerCase())
        const teamMatch = p.statistics?.[0]?.team?.name?.toLowerCase().includes(team.toLowerCase())
        return nameMatch && teamMatch
      }) || data.response[0]
      
      return player?.player?.photo || null
    }
    
    return null
  } catch (error) {
    console.error(`API-Sports error for ${playerName}:`, error)
    return null
  }
}

async function fetchPlayerImage(playerName: string, team: string, sport: string): Promise<string | null> {
  let imageUrl = await fetchFromTheSportsDB(playerName, team)
  
  if (!imageUrl && sport === "NFL") {
    imageUrl = await fetchFromAPISports(playerName, team)
  }
  
  return imageUrl
}

async function syncPlayerImages() {
  console.log("Starting player image sync...")
  
  const players = await prisma.sportsPlayer.findMany({
    where: {
      sport: "NFL",
      imageUrl: null,
    },
    take: 50,
    select: {
      id: true,
      name: true,
      team: true,
      sport: true,
    },
  })
  
  console.log(`Found ${players.length} players without images`)
  
  let successCount = 0
  let failCount = 0
  
  for (const player of players) {
    try {
      console.log(`Fetching image for ${player.name} (${player.team || "FA"})...`)
      
      const imageUrl = await fetchPlayerImage(player.name, player.team || "", player.sport)
      
      if (imageUrl) {
        await prisma.sportsPlayer.update({
          where: { id: player.id },
          data: { imageUrl },
        })
        
        try {
          await prisma.playerImage.create({
            data: {
              playerId: player.id,
              url: imageUrl,
              isPrimary: true,
              source: "thesportsdb",
              confidence: 0.8,
            },
          })
        } catch (e) {
          // Image might already exist
        }
        
        successCount++
        console.log(`SUCCESS ${player.name}: ${imageUrl}`)
      } else {
        failCount++
        console.log(`FAIL ${player.name}: No image found`)
      }
      
      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Error processing ${player.name}:`, error)
      failCount++
    }
  }
  
  console.log(`Sync complete!`)
  console.log(`Success: ${successCount}`)
  console.log(`Failed: ${failCount}`)
}

syncPlayerImages()
  .then(() => {
    console.log("Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })