const legalDeliveryTypes = new Set(['run', 'bye', 'legBye', 'wicket']);

function createBatsmanStats(name) {
  return {
    name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    status: 'notOut',
  };
}

function createBowlerStats(name) {
  return {
    name,
    balls: 0,
    runs: 0,
    wickets: 0,
    overs: '0.0',
    economy: 0,
  };
}

function toOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function createDeliveryEvent(
  type,
  value = 0,
  strikerName = null,
  bowlerName = null
) {
  const base = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label: '',
    runsOffBat: 0,
    extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
    isWicket: false,
    legalDelivery: legalDeliveryTypes.has(type),
    strikerName,
    bowlerName,
    createdAt: Date.now(),
  };

  if (type === 'run') {
    base.runsOffBat = value;
    base.label = String(value);
  } else if (type === 'wide') {
    base.extras.wide = 1;
    base.label = 'Wd';
    base.legalDelivery = false;
  } else if (type === 'noBall') {
    base.extras.noBall = 1;
    base.label = 'Nb';
    base.legalDelivery = false;
  } else if (type === 'bye') {
    base.extras.bye = 1;
    base.label = 'B';
  } else if (type === 'legBye') {
    base.extras.legBye = 1;
    base.label = 'Lb';
  } else if (type === 'wicket') {
    base.isWicket = true;
    base.label = 'W';
  }

  return base;
}

function ensureTwoPlayers(list, fallbackPrefix) {
  const safe = list && list.length > 0 ? [...list] : [];
  if (safe.length === 0) safe.push(`${fallbackPrefix} 1`);
  if (safe.length === 1) safe.push(`${fallbackPrefix} 2`);
  return safe;
}

export function computeInningsState(matchSession, deliveries) {
  const battingPlayers = ensureTwoPlayers(
    matchSession?.battingTeam?.players || [],
    'Batter'
  );
  const bowlingPlayers = ensureTwoPlayers(
    matchSession?.bowlingTeam?.players || [],
    'Bowler'
  );

  const batsmanStats = {};
  battingPlayers.forEach((name) => {
    batsmanStats[name] = createBatsmanStats(name);
  });

  const bowlerStats = {};
  bowlingPlayers.forEach((name) => {
    bowlerStats[name] = createBowlerStats(name);
  });

  let strikerIndex = 0;
  let nonStrikerIndex = 1;
  let nextBatterIndex = 2;
  let currentBowlerIndex = 0;

  let totalRuns = 0;
  let wickets = 0;
  let legalBalls = 0;
  let extras = { wide: 0, noBall: 0, bye: 0, legBye: 0 };
  let lastWicketRuns = 0;
  let lastWicketBalls = 0;

  const timeline = [];

  deliveries.forEach((delivery) => {
    if (!delivery) return;

    if (delivery.strikerName) {
      const currentStriker = battingPlayers[strikerIndex];
      const currentNonStriker = battingPlayers[nonStrikerIndex];
      if (
        delivery.strikerName === currentNonStriker &&
        delivery.strikerName !== currentStriker
      ) {
        const temp = strikerIndex;
        strikerIndex = nonStrikerIndex;
        nonStrikerIndex = temp;
      }
    }

    const strikerName = battingPlayers[strikerIndex];
    if (delivery.bowlerName) {
      const explicitBowlerIndex = bowlingPlayers.findIndex(
        (name) => name === delivery.bowlerName
      );
      if (explicitBowlerIndex >= 0) {
        currentBowlerIndex = explicitBowlerIndex;
      }
    }
    const bowlerName = bowlingPlayers[currentBowlerIndex];

    const currentBatsman = batsmanStats[strikerName];
    const currentBowler = bowlerStats[bowlerName];

    const deliveryExtras = delivery.extras || {};
    const wideRuns = deliveryExtras.wide || 0;
    const noBallRuns = deliveryExtras.noBall || 0;
    const byeRuns = deliveryExtras.bye || 0;
    const legByeRuns = deliveryExtras.legBye || 0;
    const runsOffBat = delivery.runsOffBat || 0;
    const eventRuns = runsOffBat + wideRuns + noBallRuns + byeRuns + legByeRuns;

    totalRuns += eventRuns;
    extras = {
      wide: extras.wide + wideRuns,
      noBall: extras.noBall + noBallRuns,
      bye: extras.bye + byeRuns,
      legBye: extras.legBye + legByeRuns,
    };

    currentBowler.runs += runsOffBat + wideRuns + noBallRuns;

    if (delivery.type === 'run') {
      currentBatsman.runs += runsOffBat;
      if (runsOffBat === 4) currentBatsman.fours += 1;
      if (runsOffBat === 6) currentBatsman.sixes += 1;
    }

    if (delivery.legalDelivery) {
      legalBalls += 1;
      currentBatsman.balls += 1;
      currentBowler.balls += 1;
    }

    if (delivery.isWicket) {
      wickets += 1;
      currentBowler.wickets += 1;
      currentBatsman.status = 'out';
      lastWicketRuns = totalRuns;
      lastWicketBalls = legalBalls;

      if (nextBatterIndex < battingPlayers.length) {
        strikerIndex = nextBatterIndex;
        nextBatterIndex += 1;
      }
    } else {
      const runsForStrike = runsOffBat + byeRuns + legByeRuns;
      if (runsForStrike % 2 === 1) {
        const temp = strikerIndex;
        strikerIndex = nonStrikerIndex;
        nonStrikerIndex = temp;
      }
    }

    if (delivery.legalDelivery && legalBalls % 6 === 0) {
      const temp = strikerIndex;
      strikerIndex = nonStrikerIndex;
      nonStrikerIndex = temp;

      if (bowlingPlayers.length > 1) {
        currentBowlerIndex = (currentBowlerIndex + 1) % bowlingPlayers.length;
      }
    }

    timeline.push({
      id: delivery.id,
      label: delivery.label,
      runs: eventRuns,
      isWicket: delivery.isWicket,
      legalDelivery: delivery.legalDelivery,
      deliveryType: delivery.type,
      over: toOvers(legalBalls),
      striker: strikerName,
      bowler: bowlerName,
    });
  });

  const battingList = Object.values(batsmanStats).map((b) => ({
    ...b,
    strikeRate: b.balls > 0 ? Number(((b.runs / b.balls) * 100).toFixed(2)) : 0,
  }));

  const bowlingList = Object.values(bowlerStats).map((b) => ({
    ...b,
    overs: toOvers(b.balls),
    economy: b.balls > 0 ? Number(((b.runs * 6) / b.balls).toFixed(2)) : 0,
  }));

  const extrasTotal = extras.wide + extras.noBall + extras.bye + extras.legBye;
  const runRate = legalBalls > 0 ? Number(((totalRuns * 6) / legalBalls).toFixed(2)) : 0;
  const currentPartnershipRuns = totalRuns - lastWicketRuns;
  const currentPartnershipBalls = legalBalls - lastWicketBalls;

  return {
    score: {
      runs: totalRuns,
      wickets,
      overs: toOvers(legalBalls),
      legalBalls,
      runRate,
    },
    extras: {
      ...extras,
      total: extrasTotal,
    },
    currentBatsmen: [
      batsmanStats[battingPlayers[strikerIndex]] || null,
      batsmanStats[battingPlayers[nonStrikerIndex]] || null,
    ],
    currentBowler: bowlerStats[bowlingPlayers[currentBowlerIndex]] || null,
    partnership: {
      runs: currentPartnershipRuns,
      balls: currentPartnershipBalls,
    },
    battingStats: battingList,
    bowlingStats: bowlingList,
    timeline,
  };
}
