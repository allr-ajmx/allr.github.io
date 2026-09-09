import { deriveState, trialDaysLeft } from "@/lib/account/state";
import { ensureTrial, readProfile } from "@/lib/server/profiles";
import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { TRIAL_CREDIT_USD } from "@/lib/account/model";

/**
 * How much of the promotional credit is left.
 *
 * **Partly mocked.** The trial window and the grant are real — they are stamped
 * on the profile by the server. What is *used* is not: nothing meters AI spend
 * yet, so `usedUsd` is whatever is recorded on the profile, which today is
 * always zero. The shape is the one the real endpoint will return, so the bar
 * that renders it does not change when metering arrives — only this file does.
 */
export async function GET(request: Request) {
  try {
    const caller = await requireUser(request);
    let profile = await readProfile(caller.uid);
    if (profile) profile = await ensureTrial(profile);

    if (!profile?.trial) {
      return Response.json({
        credit: null,
        state: deriveState(profile),
        mocked: true,
      });
    }

    const { creditUsd, creditUsedUsd, startedAt, endsAt } = profile.trial;
    return Response.json({
      credit: {
        grantedUsd: creditUsd || TRIAL_CREDIT_USD,
        usedUsd: creditUsedUsd,
        remainingUsd: Math.max(0, (creditUsd || TRIAL_CREDIT_USD) - creditUsedUsd),
        startedAt,
        endsAt,
        daysLeft: trialDaysLeft(profile),
      },
      state: deriveState(profile),
      // Say so out loud, so nobody builds a billing decision on this yet.
      mocked: true,
    });
  } catch (error) {
    return toResponse(error);
  }
}
