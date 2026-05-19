import { fetchTodayAppointments } from "./calendar";
import { computeSchedule } from "./scheduler";
import { getAllStates } from "./storage";
import type { AppointmentView } from "./types";

export async function loadTodaySchedule(
  now: Date = new Date(),
): Promise<AppointmentView[]> {
  const [appointments, states] = await Promise.all([
    fetchTodayAppointments(now),
    getAllStates(now),
  ]);
  return computeSchedule(appointments, states, now);
}
