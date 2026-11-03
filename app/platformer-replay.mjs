export function inputMask(input) { return (input.left?1:0)|(input.right?2:0)|(input.jumpHeld?4:0)|(input.jumpPressed?8:0); }
export function appendReplay(replay,mask) {
  const last=replay[replay.length-1];
  if(last && last[0]===mask && !(mask&8)) last[1]++;
  else replay.push([mask,1]);
}
export function formatRaceTime(milliseconds) {
  const minutes=Math.floor(milliseconds/60000);
  const seconds=((milliseconds%60000)/1000).toFixed(3).padStart(6,'0');
  return `${minutes}:${seconds}`;
}
