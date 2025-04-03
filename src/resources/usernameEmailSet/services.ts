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
      return new Ok({ data: [], kind: "notFound" });
    }

    return new Ok({ data: [usernameEmailSet], kind: "success" });
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error updating username" });
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
      return new Ok({ data: [], kind: "notFound" });
    }

    return new Ok({ data: [usernameEmailSet], kind: "success" });
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error updating email" });
  }
}

export {
  updateUsernameEmailSetWithEmailService,
  updateUsernameEmailSetWithUsernameService,
};
