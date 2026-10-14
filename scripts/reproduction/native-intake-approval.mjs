// Proposal-aware v2 for newly frozen pilots only. Original helper/v8 evidence remain unchanged.
// Supervisor test policy, not product authorization. Native asked/decided rows may commit only
// after the live permission RPC resolves, so they are a post-decision audit, never a live latch.
import {isDeepStrictEqual} from 'node:util';
import {stageApprovalScope,commitApprovalScope} from '../../plugin/src/intake-tools.mjs';
const writes=new Set(['fitplate_propose_constraints','fitplate_commit_task','fitplate_load_task','fitplate_build_candidate','fitplate_validate_candidate','fitplate_export_package']);
export function decidePilotPermission({rpc,call,state}){
 const tool=call?.name,args=call?.args??{};
 if(!rpc||!call||!writes.has(tool)||rpc.tool!==tool||rpc.toolCallId!==call.toolUseId||!isDeepStrictEqual(rpc.rawInput,args))return{allow:false,reason:'unrecognized-or-mismatched-tool'};
 const policy=call.resolvedPolicy;
 if(policy?.requiresApproval!=='always'||policy.isReadOnly!==false||!Array.isArray(policy.approvalScopes))return{allow:false,reason:'not-the-approved-write-policy'};
 let scope=null;
 if(tool==='fitplate_propose_constraints'){
  if(args.request_sha256!==state?.sent?.sha256)return{allow:false,reason:'request-byte-identity-mismatch'};
  scope=stageApprovalScope({requestRef:args.request_ref,requestSha256:args.request_sha256,textProposals:args.text_proposals});
 }
 if(tool==='fitplate_commit_task'){
  if(args.request_ref!==state?.card?.attachmentRef||args.request_sha256!==state?.sent?.sha256||args.draft_hash!==state?.card?.draftHash||args.confirmation_sha256!==state?.confirmation?.sha256)return{allow:false,reason:'confirmation-identity-mismatch'};
  scope=commitApprovalScope({requestRef:args.request_ref,requestSha256:args.request_sha256,draftHash:args.draft_hash,confirmationRef:args.confirmation_ref,confirmationSha256:args.confirmation_sha256});
 }
 if(scope!==null&&(policy.approvalScopes.length!==1||policy.approvalScopes[0]!==scope))return{allow:false,reason:'classified-scope-mismatch'};
 return{allow:true,reason:'exact-live-host-request',scope,tool};
}
