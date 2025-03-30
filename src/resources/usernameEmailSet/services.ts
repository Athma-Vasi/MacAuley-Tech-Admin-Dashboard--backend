import { UsernameEmailSetModel } from "./usernameEmailSet.model";
import { createHttpResultError, createHttpResultSuccess } from "../../utils";
import { Err, Ok } from "ts-results";
import { ServiceResult } from "../../types";

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
