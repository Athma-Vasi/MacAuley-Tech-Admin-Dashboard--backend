import { Err, Ok } from "ts-results";
import type { ServiceResult } from "../../types";
import { UsernameEmailSetModel } from "./model";

async function updateUsernameEmailSetWithUsernameService(
  username: string,
): ServiceResult {
  try {
    const usernameEmailSet = await UsernameEmailSetModel.findOneAndUpdate(
      {},
      { $push: { username: username } },
      { new: true },
    )
      .lean()
      .exec();

    if (usernameEmailSet === null || usernameEmailSet === undefined) {
      return new Ok({ kind: "notFound" });
    }

    return new Ok({ data: usernameEmailSet, kind: "success" });
  } catch (error: unknown) {
    return new Err({ data: error, kind: "error" });
  }
}

async function updateUsernameEmailSetWithEmailService(
  email: string,
): ServiceResult {
  try {
    const usernameEmailSet = await UsernameEmailSetModel.findOneAndUpdate(
      {},
      { $push: { email: email } },
      { new: true },
    )
      .lean()
      .exec();

    if (usernameEmailSet === null || usernameEmailSet === undefined) {
      return new Ok({ kind: "notFound" });
    }

    return new Ok({ data: usernameEmailSet, kind: "success" });
  } catch (error: unknown) {
    return new Err({ data: error, kind: "error" });
  }
}

export {
  updateUsernameEmailSetWithEmailService,
  updateUsernameEmailSetWithUsernameService,
};
