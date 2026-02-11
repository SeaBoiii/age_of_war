export const USER_GESTURE_EVENT = 'age_of_war_user_gesture';

export function emitUserGesture(): void {
  window.dispatchEvent(new Event(USER_GESTURE_EVENT));
}
