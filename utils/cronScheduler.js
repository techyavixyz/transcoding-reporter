const cron = require("node-cron");
const { generateReports } = require("./reporter");
const { sendReportEmail } = require("./email");
const config = require("../config");

// ------------------ Job Execution ------------------ //
async function runJob() {
  try {
    const { htmlReport, csv } = await generateReports({ onlyInQueue: true });
    await sendReportEmail(htmlReport, Buffer.from(csv));
    console.log("Report sent");
    
    // Show upcoming runs again after sending the report
    showUpcomingRuns();
  } catch (err) {
    console.error(" Error in report job:", err.message);
  }
}

// ------------------ Cron Parser ------------------ //
function calculateNextRuns(cronExpression, maxRuns = 10) {
  try {
    const runs = [];
    const now = new Date();
    const today = now.toDateString();
    
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression format');
    }
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Parse hours
    const hours = hour.includes(',') 
      ? hour.split(',').map(h => parseInt(h)).filter(h => !isNaN(h))
      : [parseInt(hour)];
    
    // Parse minutes
    const minutes = minute.includes(',') 
      ? minute.split(',').map(m => parseInt(m)).filter(m => !isNaN(m))
      : [parseInt(minute)];
    
    // Calculate all possible runs for today
    for (const h of hours) {
      if (isNaN(h)) continue;
      
      for (const m of minutes) {
        if (isNaN(m)) continue;
        
        const nextRun = new Date(now);
        nextRun.setHours(h, m, 0, 0);
        
        // Only include future runs today
        if (nextRun.toDateString() === today && nextRun > now) {
          runs.push(nextRun);
          if (runs.length >= maxRuns) break;
        }
      }
      if (runs.length >= maxRuns) break;
    }
    
    // Sort by time and format
    return runs.sort((a, b) => a - b).map(date => date.toLocaleString());
  } catch (err) {
    console.warn(`⚠️ Could not calculate next runs for "${cronExpression}":`, err.message);
    return [];
  }
}

// ------------------ Show Upcoming Runs ------------------ //
function showUpcomingRuns() {
  if (config.schedule.mode !== "cron") return;
  
  const exprs = (config.schedule.cronExpression || "0 */4 * * *").split(";");
  const allTodayRuns = [];
  const activeExpressions = [];

  exprs.forEach((expr) => {
    expr = expr.trim();
    if (!expr) return;

    try {
      cron.validate(expr);
      activeExpressions.push(expr);
      
      // Calculate upcoming runs for this expression
      const todayRuns = calculateNextRuns(expr);
      allTodayRuns.push(...todayRuns);
    } catch (err) {
      // Skip invalid expressions
    }
  });

  // Show combined results
  if (allTodayRuns.length > 0) {
    const uniqueRuns = [...new Set(allTodayRuns)].sort();
    console.log(" All upcoming runs today:", uniqueRuns.join(" | "));
  } else {
    console.log(" No more runs scheduled for today");
  }
  
  console.log(` Total expressions scheduled: ${activeExpressions.length}`);
}

// ------------------ Scheduler ------------------ //
function initializeScheduler() {
  if (config.schedule.mode === "cron") {
    scheduleCronJobs();
  } else {
    scheduleInterval();
  }
}

function scheduleCronJobs() {
  const exprs = (config.schedule.cronExpression || "0 */4 * * *").split(";");
  const activeExpressions = [];

  console.log(" Scheduling cron jobs with expressions:");
  
  exprs.forEach((expr) => {
    expr = expr.trim();
    if (!expr) return;

    // Validate and schedule each expression
    try {
      cron.validate(expr);
      cron.schedule(expr, runJob);
      activeExpressions.push(expr);
      console.log(`    "${expr}"`);
    } catch (err) {
      console.log(`   "${expr}" - Invalid: ${err.message}`);
    }
  });

  // Show initial upcoming runs
  showUpcomingRuns();
}

function scheduleInterval() {
  let delay = 5 * 60 * 1000; // default 5m
  if (config.schedule.type === "minutes") delay = config.schedule.value * 60 * 1000;
  if (config.schedule.type === "hours") delay = config.schedule.value * 60 * 60 * 1000;
  if (config.schedule.type === "daily") delay = config.schedule.value * 24 * 60 * 60 * 1000;

  const next = new Date(Date.now() + delay);
  console.log(
    `Next run scheduled in ${config.schedule.value} ${config.schedule.type} → ${next.toLocaleString()}`
  );

  setTimeout(async function runAndReschedule() {
    await runJob();
    scheduleInterval(); // re-schedule
  }, delay);
}

module.exports = {
  initializeScheduler,
  runJob,
  calculateNextRuns,
  showUpcomingRuns
};