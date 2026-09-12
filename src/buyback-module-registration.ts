import { ByteArray, crypto, DataSourceContext } from "@graphprotocol/graph-ts";
import { RoleGranted } from "../generated/ICHICHAIN/ICHICHAIN";
import { DoudoPrizeBuybackModuleUpgradeable } from "../generated/ICHICHAIN/DoudoPrizeBuybackModuleUpgradeable";
import { PrizeBuybackModule } from "../generated/templates";
import { PrizeBuybackModuleRegistration } from "../generated/schema";

export function handleBuybackModuleRoleGranted(event: RoleGranted): void {
  if (!event.params.role.equals(crypto.keccak256(ByteArray.fromUTF8("MODULE_ROLE")))) return;
  if (PrizeBuybackModuleRegistration.load(event.params.account) != null) return;
  const module = DoudoPrizeBuybackModuleUpgradeable.bind(event.params.account);
  const limit = module.try_MAX_BATCH_SIZE();
  const core = module.try_core();
  if (limit.reverted || core.reverted || limit.value.toI32() != 50 || !core.value.equals(event.address)) return;
  const registration = new PrizeBuybackModuleRegistration(event.params.account);
  registration.core = event.address;
  registration.blockNumber = event.block.number;
  registration.save();
  const context = new DataSourceContext();
  context.setBytes("core", event.address);
  PrizeBuybackModule.createWithContext(event.params.account, context);
}
