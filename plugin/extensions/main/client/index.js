/* FitPlate workbench panel · version 0.1.2 · build 451ae18e54f3 · sources plugin/package.json */
var It={name:"@fitplate/plugin-client",version:"0.1.2",buildHash:"451ae18e54f3a0a76ce1af72abdf77e7e3b1a51734c1e3ea135400357bf64ec6",sourceHash:"899c64ae7a47faffdb0863284fdede48bf4167922bce6f7adfdf1789cadc25bd",builtWith:{esbuild:"0.28.2",three:"0.186.1",node:"v24.21.0"},externals:["react","react/jsx-runtime","react-dom","react-dom/client","@agnes/cordis","@agnes/web-client"],buildHashAlgorithm:"sha256"};import{useCallback as Os,useEffect as Nn,useId as Qv,useMemo as Wi,useRef as el,useState as ni,useSyncExternalStore as tl}from"react";var Un=typeof It<"u"&&It!==null?It:{name:"@fitplate/plugin-client",version:"0.0.0-dev",buildHash:"dev-unbuilt",builtWith:{},externals:[],buildHashAlgorithm:"sha256"};function mu(){let n=Un.builtWith.esbuild?` \xB7 esbuild ${Un.builtWith.esbuild}`:"",e=Un.builtWith.three?` \xB7 three ${Un.builtWith.three}`:"";return`\u63D2\u4EF6\u7248\u672C ${Un.version} \xB7 \u6784\u5EFA\u54C8\u5E0C ${Un.buildHash.slice(0,12)}${n}${e}`}var ll=["mm","cm","m","um","in"],cf=Object.freeze({mm:1,cm:10,m:1e3,um:.001,in:25.4}),ai=(n,e)=>n*cf[e],Bs=["user_supplied","measured_device","vendor_datasheet","synthetic_teaching_fixture","design_assumption"],Ii=Object.freeze({user_supplied:"\u7528\u6237\u63D0\u4F9B\uFF08\u81EA\u8FF0\u4E8B\u5B9E\uFF09",measured_device:"\u5B9E\u6D4B\u8BBE\u5907\u5C3A\u5BF8",vendor_datasheet:"\u5382\u5546\u8D44\u6599\uFF08\u6570\u636E\u8868\uFF09",synthetic_teaching_fixture:"\u6559\u5B66\u793A\u4F8B\u6570\u636E",design_assumption:"\u8BBE\u8BA1\u5047\u8BBE\uFF08\u975E\u5B9E\u6D4B\uFF09"}),cl=Object.freeze({fixed:"\u56FA\u5B9A\u4E2D\u5FC3\uFF08\u4E0D\u8BB8\u5E73\u79FB\uFF09",x_range:"\u4EC5 X \u65B9\u5411\u8303\u56F4",y_range:"\u4EC5 Y \u65B9\u5411\u8303\u56F4",xy_range:"X/Y \u53CC\u5411\u8303\u56F4"}),ul="fitplate-request.json",Lr="fitplate-confirmation.json",hl="application/json",vu="fitplate.intake",Fr=/^[a-z0-9][a-z0-9-]{1,40}$/,Ur=/^[0-9a-f]{64}$/,xu=/^session-file:\/\/([1-9][0-9]*)\/([1-9][0-9]*)$/,uf=/^[a-z][a-z0-9_]{0,63}$/,gu=65536,_u=4e3,ln=class extends Error{code;constructor(e,t){super(t),this.name="IntakeUiError",this.code=e}};function Or(){return{unit:"mm",text:"",deviceCardId:"",plate:{width:"",height:"",thickness:"",widthEditable:!1,widthMin:"",widthMax:"",heightEditable:!1,heightMin:"",heightMax:""},baseHoles:{diameter:"",centers:[{x:"",y:""}]},mounting:{holeDiameter:"",licenseMode:"",centerX:"",centerY:"",xMin:"",xMax:"",yMin:"",yMax:""},environment:{source:"",note:"",cylinders:[],screwHeads:[],connectorMode:"",connector:{xMin:"",xMax:"",yMin:"",yMax:"",zMin:"",zMax:""},support:!0},requirements:{source:"",clearance:"",edge:"",hole:"",tolerance:""}}}function dl(n){return JSON.parse(JSON.stringify(n))}var hf=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;function on(n,e,t){let i=n.trim();if(!i)return t.push({path:e,message:"\u7F3A\u5C11\u6570\u503C",kind:"missing-number"}),null;if(!hf.test(i))return t.push({path:e,message:/^[mM]\d/.test(i)?"\u87BA\u7EB9\u89C4\u683C\uFF08\u5982 M3\uFF09\u4E0D\u662F\u5B54\u5F84\u6216\u957F\u5EA6\u6570\u503C":`\u4E0D\u662F\u6709\u6548\u6570\u503C\uFF1A${i}`}),null;let s=Number(i);return Number.isFinite(s)?s:(t.push({path:e,message:`\u6570\u503C\u8D85\u51FA\u53EF\u8868\u793A\u8303\u56F4\uFF1A${i}`}),null)}var Ci=(n,e,t,i)=>{let s=on(n,e,t);return s===null?null:s<=0?(t.push({path:e,message:`${i}\u5FC5\u987B\u5927\u4E8E 0\uFF08\u5F53\u524D ${s}\uFF09`}),null):s},Dr=(n,e,t)=>{let i=on(n,e,t);return i===null?null:i<0?(t.push({path:e,message:`\u8981\u6C42\u503C\u4E0D\u80FD\u4E3A\u8D1F\uFF08\u5F53\u524D ${i}\uFF09`}),null):i};function $i(n,e,t,i,s,r){let a=on(e,`${i}.min`,s),o=on(t,`${i}.max`,s);if(a===null||o===null)return null;let l=ai(a,n.unit),c=ai(o,n.unit);return l<c?[l,c]:(s.push({path:i,message:`${r}\u4E0B\u9650\uFF08${a}\uFF09\u987B\u5C0F\u4E8E\u4E0A\u9650\uFF08${o}\uFF09\uFF08\u6309 mm \u6BD4\u8F83\uFF1A${l} \u2265 ${c}\uFF09`}),null)}function al(n,e,t,i,s){let r=on(e,`${i}[0]`,s),a=on(t,`${i}[1]`,s);if(r===null||a===null)return null;let o=ai(r,n.unit),l=ai(a,n.unit);return o<l?[o,l]:(s.push({path:i,message:`Z \u8303\u56F4\u5FC5\u987B\u9012\u589E\uFF08\u5F53\u524D ${r} \u2192 ${a}\uFF0C\u6309 mm\uFF1A${o} \u2192 ${l}\uFF09`}),null)}function Yi(n){let e=[];ll.includes(n.unit)||e.push({path:"unit",message:"\u8BF7\u9009\u62E9\u53D7\u652F\u6301\u7684\u957F\u5EA6\u5355\u4F4D"}),n.text.trim()?n.text.length>_u&&e.push({path:"text",message:`\u8981\u6C42\u6587\u672C\u8D85\u8FC7 ${_u} \u5B57`}):e.push({path:"text",message:"\u8BF7\u586B\u5199\u77ED\u4E2D\u6587\u8981\u6C42"}),n.deviceCardId?zs.some(u=>u.id===n.deviceCardId)||e.push({path:"device_card_id",message:`\u672A\u767B\u8BB0\u7684\u8BBE\u5907\u5361\uFF1A${n.deviceCardId}`}):e.push({path:"device_card_id",message:"\u8BF7\u9009\u62E9\u767B\u8BB0\u8BBE\u5907\u5361"});let i=Ci(n.plate.width,"form.plate.width",e,"\u677F\u5BBD"),s=Ci(n.plate.height,"form.plate.height",e,"\u677F\u9AD8"),r=Ci(n.plate.thickness,"form.plate.thickness",e,"\u677F\u539A");if(n.plate.widthEditable){let u=$i(n,n.plate.widthMin,n.plate.widthMax,"form.plate.editable.width",e,"\u677F\u5BBD\u8BB8\u53EF\u533A\u95F4");if(u&&i!==null){let d=ai(i,n.unit);(d<u[0]||d>u[1])&&e.push({path:"form.plate.editable.width",message:`\u677F\u5BBD\u6807\u79F0\u503C\u987B\u843D\u5728\u5176\u8BB8\u53EF\u533A\u95F4\u5185\uFF08${d} \u4E0D\u5728 [${u[0]}, ${u[1]}] mm\uFF09`})}}if(n.plate.heightEditable){let u=$i(n,n.plate.heightMin,n.plate.heightMax,"form.plate.editable.height",e,"\u677F\u9AD8\u8BB8\u53EF\u533A\u95F4");if(u&&s!==null){let d=ai(s,n.unit);(d<u[0]||d>u[1])&&e.push({path:"form.plate.editable.height",message:`\u677F\u9AD8\u6807\u79F0\u503C\u987B\u843D\u5728\u5176\u8BB8\u53EF\u533A\u95F4\u5185\uFF08${d} \u4E0D\u5728 [${u[0]}, ${u[1]}] mm\uFF09`})}}if(Ci(n.baseHoles.diameter,"form.base_holes.diameter",e,"\u5E95\u5EA7\u5B54\u5F84"),n.baseHoles.centers.length===0&&e.push({path:"form.base_holes.centers",message:"\u81F3\u5C11\u9700\u8981 1 \u4E2A\u5E95\u5EA7\u5B54\u4E2D\u5FC3"}),n.baseHoles.centers.forEach((u,d)=>{on(u.x,`form.base_holes.centers[${d}].x`,e),on(u.y,`form.base_holes.centers[${d}].y`,e)}),Ci(n.mounting.holeDiameter,"form.mounting.plate_hole_diameter",e,"\u677F\u4FA7\u5B89\u88C5\u5B54\u5F84"),!n.mounting.licenseMode)e.push({path:"form.mounting.movement_license",message:"\u8BF7\u9009\u62E9\u79FB\u52A8\u8BB8\u53EF\u65B9\u5F0F\uFF08\u56FA\u5B9A\u6216\u660E\u786E\u8303\u56F4\uFF09"});else{let u=n.mounting.licenseMode;(u==="fixed"||u==="y_range")&&on(n.mounting.centerX,"form.mounting.center_x",e),(u==="fixed"||u==="x_range")&&on(n.mounting.centerY,"form.mounting.center_y",e),(u==="x_range"||u==="xy_range")&&$i(n,n.mounting.xMin,n.mounting.xMax,"form.mounting.center_x_range",e,"X \u8BB8\u53EF\u8303\u56F4"),(u==="y_range"||u==="xy_range")&&$i(n,n.mounting.yMin,n.mounting.yMax,"form.mounting.center_y_range",e,"Y \u8BB8\u53EF\u8303\u56F4")}n.environment.source?Bs.includes(n.environment.source)||e.push({path:"form.environment.source",message:`\u672A\u77E5\u6765\u6E90\uFF1A${n.environment.source}`}):e.push({path:"form.environment.source",message:"\u8BF7\u9009\u62E9\u73AF\u5883\u6765\u6E90"}),n.environment.note.length>300&&e.push({path:"form.environment.note",message:"\u73AF\u5883\u5907\u6CE8\u8D85\u8FC7 300 \u5B57"}),n.environment.cylinders.length===0&&e.push({path:"form.environment.fixed_cylinders",message:"\u573A\u666F\u5408\u540C\u8981\u6C42\u81F3\u5C11 1 \u4E2A\u56FA\u5B9A\u67F1\u5706\u67F1\u969C\u788D"});let a=new Set;n.environment.cylinders.forEach((u,d)=>{let h=`form.environment.fixed_cylinders[${d}]`;uf.test(u.id)?a.has(u.id)?e.push({path:`${h}.id`,message:`\u56FA\u5B9A\u67F1 id \u91CD\u590D\uFF1A${u.id}`}):a.add(u.id):e.push({path:`${h}.id`,message:"\u56FA\u5B9A\u67F1 id \u987B\u4E3A\u5C0F\u5199\u5B57\u6BCD\u5F00\u5934\u7684\u5B89\u5168\u6807\u8BC6\uFF08a-z0-9_\uFF09"}),on(u.x,`${h}.axis_xy[0]`,e),on(u.y,`${h}.axis_xy[1]`,e),Ci(u.radius,`${h}.radius`,e,"\u56FA\u5B9A\u67F1\u534A\u5F84"),al(n,u.zMin,u.zMax,`${h}.z_range`,e)});let o=n.baseHoles.centers.length,l=new Map;n.environment.screwHeads.forEach((u,d)=>{let h=`form.environment.screw_heads[${d}]`,p=on(u.holeIndex,`${h}.base_hole_index`,e);p!==null&&(!Number.isInteger(p)||p<0||p>=Math.max(1,o)?e.push({path:`${h}.base_hole_index`,message:`\u5E95\u5EA7\u5B54\u7D22\u5F15 ${p} \u4E0D\u5B58\u5728\uFF08\u5171 ${o} \u4E2A\u5B54\uFF09`}):l.set(p,(l.get(p)??0)+1)),Ci(u.radius,`${h}.radius`,e,"\u87BA\u9489\u5934\u534A\u5F84"),al(n,u.zMin,u.zMax,`${h}.z_range`,e)});for(let u=0;u<o;u+=1){let d=l.get(u)??0;d!==1&&e.push({path:"form.environment.screw_heads",message:`\u5E95\u5EA7\u5B54 #${u} \u9700\u8981\u6070\u597D 1 \u4E2A\u87BA\u9489\u5934\u5305\u7EDC\uFF08\u5F53\u524D ${d}\uFF09`})}if(!n.environment.connectorMode)e.push({path:"form.environment.connector_access",message:"\u8BF7\u58F0\u660E\u8FDE\u63A5\u5668\u7A7A\u95F4\u76D2\uFF0C\u6216\u660E\u786E\u9009\u62E9\u201C\u672A\u8986\u76D6\u201D"});else if(n.environment.connectorMode==="box"){let u=n.environment.connector;$i(n,u.xMin,u.xMax,"form.environment.connector_access.local_x",e,"\u8FDE\u63A5\u5668\u5C40\u90E8 X \u8303\u56F4"),$i(n,u.yMin,u.yMax,"form.environment.connector_access.local_y",e,"\u8FDE\u63A5\u5668\u5C40\u90E8 Y \u8303\u56F4"),al(n,u.zMin,u.zMax,"form.environment.connector_access.absolute_z",e)}n.requirements.source?Bs.includes(n.requirements.source)||e.push({path:"form.requirements.source",message:`\u672A\u77E5\u6765\u6E90\uFF1A${n.requirements.source}`}):e.push({path:"form.requirements.source",message:"\u8BF7\u9009\u62E9\u9A8C\u6536\u8981\u6C42\u6765\u6E90"}),Dr(n.requirements.clearance,"form.requirements.minimum_free_clearance",e),Dr(n.requirements.edge,"form.requirements.minimum_edge_ligament",e),Dr(n.requirements.hole,"form.requirements.minimum_hole_ligament",e);let c=Dr(n.requirements.tolerance,"form.requirements.dimensional_tolerance",e);return c!==null&&c===0&&e.push({path:"form.requirements.dimensional_tolerance",message:"\u5C3A\u5BF8\u516C\u5DEE\u5FC5\u987B\u5927\u4E8E 0"}),{ok:e.length===0,issues:e,canSubmitForClarification:e.length>0&&e.every(u=>u.kind==="missing-number"&&!u.path.endsWith(".base_hole_index"))}}function df(n){let e=n.unit,t=c=>({value:c.trim()===""?null:Number(c.trim()),unit:e}),i=(c,u)=>({min:t(c),max:t(u)}),s={width:t(n.plate.width),height:t(n.plate.height),thickness:t(n.plate.thickness),editable:{}},r={};n.plate.widthEditable&&(r.width=i(n.plate.widthMin,n.plate.widthMax)),n.plate.heightEditable&&(r.height=i(n.plate.heightMin,n.plate.heightMax)),s.editable=r;let a={plate_hole_diameter:t(n.mounting.holeDiameter)},o=n.mounting.licenseMode;o==="fixed"?a.movement_license={mode:"fixed",center:[t(n.mounting.centerX),t(n.mounting.centerY)],source_ref:"form:movement-license"}:o==="x_range"?a.movement_license={mode:"x_range",center_x:i(n.mounting.xMin,n.mounting.xMax),center_y:t(n.mounting.centerY),source_ref:"form:movement-license"}:o==="y_range"?a.movement_license={mode:"y_range",center_x:t(n.mounting.centerX),center_y:i(n.mounting.yMin,n.mounting.yMax),source_ref:"form:movement-license"}:o==="xy_range"&&(a.movement_license={mode:"xy_range",center_x:i(n.mounting.xMin,n.mounting.xMax),center_y:i(n.mounting.yMin,n.mounting.yMax),source_ref:"form:movement-license"});let l={source:n.environment.source,fixed_cylinders:n.environment.cylinders.map(c=>({id:c.id,axis_xy:[t(c.x),t(c.y)],radius:t(c.radius),z_range:[t(c.zMin),t(c.zMax)]})),screw_heads:n.environment.screwHeads.map(c=>({base_hole_index:Number(c.holeIndex.trim()),radius:t(c.radius),z_range:[t(c.zMin),t(c.zMax)]}))};return n.environment.note.trim()&&(l.note=n.environment.note.trim()),l.connector_access=n.environment.connectorMode==="not_covered"?"not_covered":{local_xy_range:[i(n.environment.connector.xMin,n.environment.connector.xMax),i(n.environment.connector.yMin,n.environment.connector.yMax)],absolute_z_range:[t(n.environment.connector.zMin),t(n.environment.connector.zMax)]},n.environment.support&&(l.support_contacts=[{a:"sensor_body",b:"plate_top"}]),{plate:s,base_holes:{diameter:t(n.baseHoles.diameter),centers:n.baseHoles.centers.map(c=>[t(c.x),t(c.y)])},mounting:a,environment:l,requirements:{source:n.requirements.source,minimum_free_clearance:t(n.requirements.clearance),minimum_edge_ligament:t(n.requirements.edge),minimum_hole_ligament:t(n.requirements.hole),dimensional_tolerance:t(n.requirements.tolerance)}}}function fl(n,e){let t=Yi(n);if(!t.ok&&!t.canSubmitForClarification)throw new ln("FORM_INVALID",`\u8868\u5355\u672A\u901A\u8FC7\u6821\u9A8C\uFF08${t.issues.length} \u9879\uFF09\uFF1A${t.issues[0]?.message??""}`);if(!Fr.test(e.requestId))throw new ln("FORM_INVALID",`request_id \u4E0D\u7B26\u5408\u7EA6\u5B9A\uFF1A${e.requestId}`);if(!Number.isSafeInteger(e.revision)||e.revision<1)throw new ln("FORM_INVALID",`request_revision \u5FC5\u987B\u662F\u6B63\u6574\u6570\uFF1A${e.revision}`);return{schema_version:"1.0",request_id:e.requestId,request_revision:e.revision,device_card_id:n.deviceCardId,language:"zh-CN",text:n.text.trim(),form:df(n)}}function ff(n){let e="";for(let i=0;i<n.length;i+=32768)e+=String.fromCharCode(...n.subarray(i,i+32768));return btoa(e)}async function pf(n){let e=await globalThis.crypto.subtle.digest("SHA-256",n);return[...new Uint8Array(e)].map(t=>t.toString(16).padStart(2,"0")).join("")}async function kr(n){let e=new TextEncoder().encode(`${JSON.stringify(n)}
`);if(e.byteLength>gu)throw new ln("DOCUMENT_TOO_LARGE",`\u8BF7\u6C42/\u786E\u8BA4\u6587\u4EF6 ${e.byteLength} \u5B57\u8282\uFF0C\u8D85\u8FC7 ${gu} \u5B57\u8282\u4E0A\u9650`);return{bytes:e,base64:ff(e),sha256:await pf(e),byteLength:e.byteLength}}function pl(n,e,t){return{type:"file",name:n,mimeType:e,data:t}}function yu(n){return["\u8BF7\u4F7F\u7528 $fitplate-design \u6280\u80FD\u5904\u7406\u672C\u6B21\u9700\u6C42\u3002","\u672C\u6B21\u8BF7\u6C42\u4F7F\u7528\u4E2D\u6587\u3002\u8BF7\u4ECE\u7B2C\u4E00\u6761\u516C\u5F00\u56DE\u590D\u8D77\u5168\u7A0B\u4F7F\u7528\u4E2D\u6587\uFF1B\u8BFB\u53D6\u9644\u4EF6\u524D\u5DF2\u6709\u6216\u5FC5\u8981\u7684\u8BF4\u660E\u4E5F\u987B\u4E2D\u6587\uFF0C\u6280\u672F ID\u3001\u8DEF\u5F84\u3001\u5355\u4F4D\u53EF\u4FDD\u7559\u539F\u6587\uFF0C\u65E0\u9700\u589E\u52A0\u5DE5\u5177\u65C1\u767D\u3002",`FitPlate \u9762\u677F\u63D0\u4EA4\u4E86\u4E00\u4EFD\u65B0\u7684\u5B89\u88C5\u9700\u6C42\uFF1A\u9644\u4EF6 ${ul}\uFF08\u5DF2\u4F5C\u4E3A\u771F\u5B9E\u7528\u6237\u6D88\u606F\u53D1\u51FA\uFF0Crequest_id=${n.requestId}\uFF0Crevision=${n.revision}\uFF09\u3002`,"\u8BF7\u5148\u8C03\u7528 fitplate_get_request \u8BFB\u53D6\u5F53\u524D\u4F1A\u8BDD\u9644\u4EF6\u7684\u771F\u5B9E\u5B57\u8282\uFF0C\u518D\u8C03\u7528 fitplate_propose_constraints \u767B\u8BB0\u7A0B\u5E8F\u7F16\u8BD1\u51FA\u7684\u8349\u7A3F\uFF1B\u4E00\u5207\u6570\u503C\u4E0E\u5355\u4F4D\u4EE5\u9644\u4EF6\u5B57\u8282\u548C\u7A0B\u5E8F\u590D\u7B97\u4E3A\u51C6\uFF0C\u4E0D\u8981\u6839\u636E\u672C\u6BB5\u6587\u5B57\u63A8\u65AD\u4EFB\u4F55\u5C3A\u5BF8\u3002",'\u82E5\u9644\u4EF6\u6587\u672C\u91CC\u542B\u6709\u5BF9\u677F\u5BBD\u7684\u660E\u786E\u4E0A\u9650\uFF08\u4F8B\u5982\u201C\u6700\u591A N\u201D\u8FD9\u7C7B\uFF09\uFF0C\u4F60\u53EF\u4EE5\u628A\u8BE5\u5904\u539F\u6587\u4F5C\u4E3A\u6587\u672C\u63D0\u8BAE\u4EA4\u7ED9\u7A0B\u5E8F\u590D\u6838\uFF1A\u8C03\u7528 fitplate_propose_constraints \u65F6\u9644\u5E26 text_proposals\uFF0C\u6BCF\u9879\u4E25\u683C\u4E3A {field_path:"plate.width", kind:"upper_bound", quote:{start,end,literal}, value, unit}\u2014\u2014quote \u5FC5\u987B\u662F\u4F60\u4ECE\u771F\u5B9E\u9644\u4EF6\u6587\u672C\u4E2D\u53D6\u51FA\u7684\u8FDE\u7EED\u539F\u6587\uFF08literal \u4E3A\u539F\u6587\u5B50\u4E32\uFF0Cstart/end \u4E3A\u5176\u5728\u6587\u672C\u4E2D\u7684\u5B57\u7B26\u504F\u79FB\uFF09\uFF0Cvalue/unit \u4E3A\u8BE5\u539F\u6587\u91CC\u7684\u6570\u503C\u4E0E\u5355\u4F4D\u3002\u5F53\u524D\u4EC5\u652F\u6301\u677F\u5BBD\u4E0A\u9650\u8FD9\u4E00\u79CD\u6587\u672C\u63D0\u8BAE\uFF1B\u7A0B\u5E8F\u4F1A\u91CD\u65B0\u6838\u5BF9\u539F\u6587\u3001\u590D\u7B97\u6BEB\u7C73\u503C\uFF0C\u5E76\u628A\u5B83\u4F5C\u4E3A\u7EA6\u675F\uFF08\u4E0D\u662F\u65B0\u7684\u540D\u4E49\u5BBD\u5EA6\uFF09\uFF0C\u6700\u7EC8\u4ECD\u7531\u7528\u6237\u6838\u5BF9\u786E\u8BA4\u3002',"\u4E0D\u8981\u7F16\u9020\u504F\u79FB\u6216\u6570\u503C\uFF1B\u65E0\u6CD5\u4ECE\u539F\u6587\u786E\u5B9A\u7684\u90E8\u5206\u4E0D\u8981\u731C\u2014\u2014\u82E5\u8349\u7A3F\u662F NEEDS_INPUT/CONFLICTING_INPUT\uFF0C\u8BF7\u628A\u7A0B\u5E8F\u7ED9\u51FA\u7684\u5177\u4F53\u95EE\u9898\u8F6C\u8FBE\u7ED9\u7528\u6237\u3002","\u8BF7\u7528\u4E2D\u6587\u7B80\u77ED\u8BF4\u660E\uFF0C\u4EC5\u8FFD\u95EE\u771F\u6B63\u7F3A\u5931\u6216\u51B2\u7A81\u7684\u4E8B\u5B9E\uFF1B\u5B8C\u6574\u8BB8\u53EF\u533A\u95F4\u91CC\u7684 value_mm=null \u662F\u5F85\u9009\u5019\u9009\u503C\uFF0C\u7531\u4F60\u5728\u8303\u56F4\u5185\u9009\u62E9\uFF0C\u4E0D\u8981\u6C42\u7528\u6237\u53E6\u7ED9 Y \u5750\u6807\u3002\u7528\u6237\u5728\u9762\u677F\u4FEE\u6539\u540E\u70B9\u51FB\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u4EA7\u751F\u65B0\u7248\u672C\uFF1BREADY_TO_CONFIRM \u65F6\u70B9\u51FB\u201C\u786E\u8BA4\u6761\u4EF6\uFF0C\u5F00\u59CB\u8BBE\u8BA1\u201D\uFF0C\u9875\u9762\u4F1A\u751F\u6210\u786E\u8BA4\u9644\u4EF6\uFF0C\u4E0D\u8BA9\u7528\u6237\u624B\u5199 JSON\u3001hash \u6216\u5F15\u7528\u504F\u79FB\u3002"].join(`

`)}function bu(n){return["\u8BF7\u4F7F\u7528 $fitplate-design \u6280\u80FD\u7EE7\u7EED\u5904\u7406\u5DF2\u786E\u8BA4\u7684\u9700\u6C42\u3002","\u8BF7\u7EE7\u7EED\u5168\u7A0B\u7528\u4E2D\u6587\u5B8C\u6210\u672C\u9636\u6BB5\uFF0C\u5305\u62EC\u5DF2\u6709\u6216\u5FC5\u8981\u7684\u5DE5\u5177\u524D\u8BF4\u660E\u4E0E\u6700\u7EC8\u4EA4\u4ED8\uFF1B\u6280\u672F ID\u3001\u8DEF\u5F84\u3001\u5355\u4F4D\u53EF\u4FDD\u7559\u539F\u6587\uFF0C\u65E0\u9700\u589E\u52A0\u5DE5\u5177\u65C1\u767D\u3002",`\u7528\u6237\u5728 FitPlate \u9762\u677F\u6838\u5BF9\u4E86\u8349\u7A3F\u5E76\u63D0\u4EA4\u4E86\u786E\u8BA4\u9644\u4EF6 ${Lr}\uFF08request_id=${n.requestId}\uFF0Crevision=${n.requestRevision}\uFF09\u3002`,`\u8BF7\u5148\u7528 read \u5DE5\u5177\u5217\u51FA\u4F1A\u8BDD\u9644\u4EF6\uFF08session-file://list\uFF09\uFF0C\u627E\u5230\u5176\u4E2D\u6700\u65B0\u7684 ${Lr} \u7684\u5B98\u65B9\u5F15\u7528 ref\uFF08\u5F62\u5982 session-file://<seq>/<index>\uFF09\uFF0C`,`\u7136\u540E\u8C03\u7528 fitplate_commit_task\uFF0C\u53C2\u6570\u5FC5\u987B\u4E14\u53EA\u80FD\u53D6\u5B98\u65B9\u503C\uFF1Arequest_ref=${n.requestAttachmentRef}\uFF0C`,`request_sha256=${n.requestAttachmentSha256}\uFF0Cdraft_hash=${n.draftHash}\uFF0C`,`confirmation_ref=\u4E0A\u9762\u5217\u8868\u91CC\u627E\u5230\u7684\u90A3\u4E2A ref\uFF0Cconfirmation_sha256=${n.confirmationSha256}\uFF08\u9762\u677F\u5BF9\u786E\u8BA4\u9644\u4EF6\u5B57\u8282\u8BA1\u7B97\u7684 SHA-256\uFF09\u3002`,"\u4E0D\u8981\u4F7F\u7528 confirmed:true \u6216\u4EFB\u4F55\u81EA\u62A5\u5B57\u6BB5\uFF1B\u4E0D\u8981\u81EA\u5DF1\u6539\u53C2\u6570\uFF1B\u51BB\u7ED3\u6210\u529F\u540E\u7EE7\u7EED fitplate_load_task\uFF0C\u518D\u6309\u6D41\u7A0B build/validate/export\u3002","\u5728\u8BB8\u53EF\u533A\u95F4\u5185\u81EA\u884C\u9009\u62E9\u660E\u786E\u5019\u9009\u5750\u6807\uFF0C\u4FDD\u6301\u9501\u5B9A\u503C\u3002\u6700\u7EC8\u7528\u5B8C\u6574\u4E2D\u6587\u77ED\u53E5\u8BF4\u660E\u72B6\u6001\u3001\u4E3B\u8981\u6539\u52A8\u3001\u5B9E\u6D4B\u6700\u7D27\u5BF9\u8C61\u5BF9/\u6570\u503C/\u8981\u6C42\u3001\u5F53\u524D\u7248\u672C\u4E0B\u8F7D\u548C\u8F6F\u4EF6\u51E0\u4F55\u9A8C\u8BC1\u8303\u56F4\uFF1B\u8BE6\u7EC6\u54C8\u5E0C\u3001\u9884\u7B97\u3001\u6765\u6E90\u4E0E\u9010\u9879\u68C0\u67E5\u7559\u5728\u5DE5\u4F5C\u53F0/\u62A5\u544A\uFF0C\u4E0D\u91CD\u590D\u5185\u90E8\u63D0\u8BAE\u5B57\u6BB5\u3002"].join(`

`)}var ks=n=>n&&typeof n=="object"&&!Array.isArray(n)?n:null,an=n=>typeof n=="string"?n:null;function Su(n){let e=ks(n);if(!e)throw new ln("PAYLOAD_INVALID","intake \u670D\u52A1\u8FD4\u56DE\u7684\u4E0D\u662F\u5BF9\u8C61");if(e.found!==!0)return{found:!1,reason:an(e.reason)??"UNKNOWN",message:an(e.message)??"intake \u670D\u52A1\u672A\u7ED9\u51FA\u539F\u56E0"};let t=an(e.request_id),i=e.request_revision,s=an(e.outcome),r=an(e.attachment_ref),a=an(e.attachment_sha256),o=ks(e.draft),l=o?an(o.draft_hash):null,c=[];if((t===null||!Fr.test(t))&&c.push("request_id"),(!Number.isSafeInteger(i)||i<1)&&c.push("request_revision"),(s===null||!["READY_TO_CONFIRM","NEEDS_INPUT","CONFLICTING_INPUT","UNSUPPORTED_REQUEST"].includes(s))&&c.push("outcome"),(r===null||!xu.test(r))&&c.push("attachment_ref"),(a===null||!Ur.test(a))&&c.push("attachment_sha256"),(l===null||!Ur.test(l))&&c.push("draft_hash"),c.length>0)throw new ln("PAYLOAD_INVALID",`intake \u670D\u52A1\u54CD\u5E94\u7F3A\u5C11\u5173\u952E\u8EAB\u4EFD\u5B57\u6BB5\uFF1A${c.join(", ")}`);let u=ks(e.device_card),d=u?an(u.id):null,h=u?an(u.sha256):null,p=ks(e.task),m=[];if(p&&Array.isArray(p.revisions))for(let y of p.revisions.slice(0,64)){let g=ks(y);g&&m.push({revision:Number.isSafeInteger(g.revision)?g.revision:null,requestRevision:Number.isSafeInteger(g.request_revision)?g.request_revision:null,draftHash:an(g.draft_hash)})}return{found:!0,requestId:t,requestRevision:i,outcome:s,stagedAt:an(e.staged_at),attachmentRef:r,attachmentSha256:a,draftHash:l,draft:o,deviceCard:d!==null?{id:d,sha256:h}:null,task:{taskId:p?an(p.task_id):null,latestRevision:p&&Number.isSafeInteger(p.latest_revision)?p.latest_revision:null,revisions:m},notes:an(e.notes)}}var dx=Object.freeze(["kind","schema_version","request_id","request_revision","draft_hash","request_attachment_ref","request_attachment_sha256"]);function mf(n){let e=[];if(Fr.test(n.requestId)||e.push("request_id"),(!Number.isSafeInteger(n.requestRevision)||n.requestRevision<1)&&e.push("request_revision"),Ur.test(n.draftHash)||e.push("draft_hash"),xu.test(n.requestAttachmentRef)||e.push("request_attachment_ref"),Ur.test(n.requestAttachmentSha256)||e.push("request_attachment_sha256"),e.length>0)throw new ln("IDENTITY_INVALID",`\u5F53\u524D\u8349\u7A3F\u8EAB\u4EFD\u4E0D\u5B8C\u6574\u6216\u5F62\u72B6\u975E\u6CD5\uFF1A${e.join(", ")}\uFF08\u62D2\u7EDD\u751F\u6210\u786E\u8BA4\u6587\u4EF6\uFF09`);return n}function Mu(n){let e=mf(n);return{kind:"fitplate-confirmation",schema_version:"1.0",request_id:e.requestId,request_revision:e.requestRevision,draft_hash:e.draftHash,request_attachment_ref:e.requestAttachmentRef,request_attachment_sha256:e.requestAttachmentSha256}}var zs=Object.freeze([Object.freeze({id:"banner-q20pd",name:"Banner Q20PD\uFF08Q20 \u7CFB\u5217\uFF0C2 m \u51FA\u7EBF\u7248\u672C\uFF09",bodySizeMm:[20,32,12],holeOffsetsMm:[[6.7,-12.7],[6.7,12.7]],holePitchMm:25.4,threadInterface:"2 \xD7 M3\xD70.5\uFF08\u8BBE\u5907\u5185\u87BA\u7EB9\uFF09",designHoleDiameterMm:3.4,sourceLevel:"datasheet_derived\uFF08\u8D44\u6599\u63A8\u5BFC\uFF0C\u51E0\u4F55/\u5B9E\u7269\u672A\u9A8C\u8BC1\uFF09",note:"\u8BBE\u5907\u5C3A\u5BF8\u53EA\u6765\u81EA\u767B\u8BB0\u5361\uFF1B\u677F\u4FA7\u901A\u5B54 \u23003.4 \u662F\u672C\u9879\u76EE\u7684\u8BBE\u8BA1\u9009\u62E9\uFF08M3 \u87BA\u9489\u95F4\u9699\u5B54\uFF09\uFF0C\u4E0D\u662F\u539F\u5382\u5C3A\u5BF8\u3002"})]);var gf="\u5728\u5141\u8BB8\u8303\u56F4\u5185\u9009\u62E9\u5408\u9002\u7684\u5B89\u88C5\u4F4D\u7F6E\uFF0C\u6EE1\u8DB3\u95F4\u9699\u4E0E\u5B54\u8FB9\u6750\u6599\u8981\u6C42\u3002";function Eu(n){let e=dl(n);return e.unit="mm",e.text=gf,e.deviceCardId="banner-q20pd",e.plate={width:"80",height:"80",thickness:"4",widthEditable:!1,widthMin:"",widthMax:"",heightEditable:!1,heightMin:"",heightMax:""},e.baseHoles={diameter:"4.4",centers:[{x:"8",y:"8"},{x:"72",y:"8"},{x:"8",y:"72"},{x:"72",y:"72"}]},e.mounting={holeDiameter:"3.4",licenseMode:"y_range",centerX:"40",centerY:"",xMin:"",xMax:"",yMin:"28",yMax:"45"},e.environment={source:"design_assumption",note:"\u81EA\u8BBE\u6F14\u793A\u73AF\u5883\uFF0C\u4F5C\u4E3A\u8868\u5355\u4E8B\u5B9E\u8F93\u5165",cylinders:[{id:"post_a",x:"28",y:"50",radius:"3",zMin:"4",zMax:"20"}],screwHeads:[0,1,2,3].map(t=>({holeIndex:String(t),radius:"4",zMin:"4",zMax:"8"})),connectorMode:"box",connector:{xMin:"-20",xMax:"-6",yMin:"-28",yMax:"-12",zMin:"8",zMax:"12"},support:!0},e.requirements={source:"design_assumption",clearance:"1.0",edge:"3.0",hole:"3.0",tolerance:"0.05"},e}var ol="abcdefghijklmnopqrstuvwxyz0123456789";function Tu(n={}){let e=n.now??(()=>Date.now()),t=n.random??(()=>Math.random()),i=Math.floor(e()).toString(36),s="";for(let a=0;a<4;a+=1)s+=ol[Math.floor(t()*ol.length)%ol.length];let r=`ui-${i}-${s}`;if(!Fr.test(r))throw new ln("FORM_INVALID",`\u751F\u6210\u7684 request_id \u975E\u6CD5\uFF1A${r}`);return r}function ml(n){let e=n.unit,t=n.mounting.licenseMode;return t?t==="fixed"?`\u56FA\u5B9A\u4E2D\u5FC3 (${n.mounting.centerX}, ${n.mounting.centerY}) ${e}`:t==="x_range"?`\u4E2D\u5FC3 X \u2208 [${n.mounting.xMin}, ${n.mounting.xMax}] ${e} \xB7 Y=${n.mounting.centerY} ${e}`:t==="y_range"?`\u4E2D\u5FC3 X=${n.mounting.centerX} ${e} \xB7 Y \u2208 [${n.mounting.yMin}, ${n.mounting.yMax}] ${e}`:`\u4E2D\u5FC3 X \u2208 [${n.mounting.xMin}, ${n.mounting.xMax}] ${e} \xB7 Y \u2208 [${n.mounting.yMin}, ${n.mounting.yMax}] ${e}`:"\u672A\u586B\u5199"}var gl=Object.freeze({READY_TO_CONFIRM:"\u8F93\u5165\u5B8C\u6574\u4E00\u81F4\uFF08\u53EF\u786E\u8BA4\uFF09",NEEDS_INPUT:"\u5F85\u8865\u5145\u4FE1\u606F",CONFLICTING_INPUT:"\u8F93\u5165\u51B2\u7A81",UNSUPPORTED_REQUEST:"\u8D85\u51FA\u73B0\u6709\u652F\u6301\u8303\u56F4"});var _f=10080*60*1e3,vl=Or();vl.environment.cylinders=[{id:"",x:"",y:"",radius:"",zMin:"",zMax:""}];vl.environment.screwHeads=[{holeIndex:"",radius:"",zMin:"",zMax:""}];function _l(n,e){if(Array.isArray(e))return Array.isArray(n)&&n.every(t=>_l(t,e[0]));if(e!==null&&typeof e=="object"){if(n===null||typeof n!="object"||Array.isArray(n))return!1;let t=n,i=Object.entries(e);return Object.keys(t).length===i.length&&i.every(([s,r])=>Object.hasOwn(t,s)&&_l(t[s],r))}return typeof n==typeof e}var vf={READY_TO_CONFIRM:{kind:"info",title:"\u7A0B\u5E8F\u5DF2\u6574\u7406\u51FA\u9700\u6C42\u8349\u7A3F\uFF0C\u5F85\u4F60\u6838\u5BF9\uFF1A\u8F93\u5165\u5B8C\u6574\u4E00\u81F4"},NEEDS_INPUT:{kind:"warn",title:"\u7A0B\u5E8F\u8349\u7A3F\u5F85\u8865\u5145\u4FE1\u606F\uFF1A\u8BF7\u6309\u95EE\u9898\u4FEE\u6539\u8F93\u5165\u540E\u91CD\u65B0\u6574\u7406"},CONFLICTING_INPUT:{kind:"warn",title:"\u7A0B\u5E8F\u8349\u7A3F\u53D1\u73B0\u8F93\u5165\u51B2\u7A81\uFF1A\u8BF7\u5148\u89E3\u51B3\u51B2\u7A81"},UNSUPPORTED_REQUEST:{kind:"warn",title:"\u7A0B\u5E8F\u8349\u7A3F\u8D85\u51FA\u76EE\u524D\u652F\u6301\u8303\u56F4"}},xf={READY_TO_CONFIRM:"\u8F93\u5165\u5B8C\u6574\u4E00\u81F4\uFF08\u53EF\u6838\u5BF9\u786E\u8BA4\uFF09",NEEDS_INPUT:"\u5F85\u8865\u5145\u4FE1\u606F",CONFLICTING_INPUT:"\u8F93\u5165\u51B2\u7A81",UNSUPPORTED_REQUEST:"\u8D85\u51FA\u652F\u6301\u8303\u56F4"},yf=new Set(["REQUEST_NOT_STAGED","NO_STAGED_REQUEST_FOR_SESSION"]);function Zi(n){if(n instanceof ln)return{message:n.message,code:n.code};if(n&&typeof n=="object"){let e=n,t=typeof e.message=="string"&&e.message?e.message:String(n),i=typeof e.code=="string"?e.code:void 0;return i?{message:t,code:i}:{message:t}}return{message:String(n)}}var Br=class{snapshot;listeners=new Set;call;commands;isBusy;now;setTimer;clearTimer;intervalMs;timeoutMs;newRequestId;generation=0;token=0;timer=null;pollKind=null;pollStartedAt=0;pollToken=-1;disposed=!1;readInFlight=null;draftStore;constructor(e){this.call=e.call,this.commands=e.commands,this.isBusy=e.isBusy,this.draftStore=e.draftStore??null,this.now=e.now??(()=>Date.now()),this.setTimer=e.setTimer??((i,s)=>globalThis.setTimeout(i,s)),this.clearTimer=e.clearTimer??(i=>globalThis.clearTimeout(i)),this.intervalMs=e.intervalMs??1500,this.timeoutMs=e.timeoutMs??12e4,this.newRequestId=e.createRequestId??(()=>Tu());let t=Or();this.snapshot={sessionKey:void 0,phase:"no-session",form:t,validation:Yi(t),sent:null,card:null,cardExpired:!1,confirmable:!1,confirmation:null,frozen:null,status:{kind:"info",title:"\u8BF7\u5148\u5728 AGH \u4E2D\u9009\u62E9\u6216\u521B\u5EFA\u4E00\u4E2A\u4F1A\u8BDD"},busy:!1,polling:!1,lastCheckedAt:null}}subscribe=e=>(this.listeners.add(e),()=>{this.listeners.delete(e)});getSnapshot=()=>this.snapshot;update(e){if(!this.disposed){this.snapshot={...this.snapshot,...e};for(let t of[...this.listeners])t()}}isCurrent(e,t){return!(this.disposed||e!==this.generation||t!==void 0&&t!==this.token)}readDraft(e){if(!this.draftStore)return null;let t=null;try{t=this.draftStore.read(e)}catch{return null}if(t===null)return null;try{let i=JSON.parse(t);if(!i||typeof i!="object"||Array.isArray(i))throw new Error("shape");let s=i;if(Object.keys(s).length!==2||!_l(s.form,vl))throw new Error("shape");let r=typeof s.savedAt=="number"?s.savedAt:0,a=this.now()-r;if(!Number.isFinite(r)||r<=0||a<0||a>_f)throw new Error("stale");return s.form}catch{try{this.draftStore.clear(e)}catch{}return null}}saveDraft(){if(!(!this.draftStore||!this.snapshot.sessionKey))try{this.draftStore.write(this.snapshot.sessionKey,JSON.stringify({form:this.snapshot.form,savedAt:this.now()}))}catch{}}clearDraft(){if(!(!this.draftStore||!this.snapshot.sessionKey))try{this.draftStore.clear(this.snapshot.sessionKey)}catch{}}setSession(e){if(this.disposed||e===this.snapshot.sessionKey)return;this.generation+=1,this.token+=1,this.stopTimer(),this.pollKind=null;let t=e?this.readDraft(e):null,i=t??Or();this.update({sessionKey:e,phase:e?"editing":"no-session",form:i,validation:Yi(i),sent:null,card:null,cardExpired:!1,confirmable:!1,confirmation:null,frozen:null,status:e?t?{kind:"info",title:"\u5DF2\u4ECE\u672C\u6D4F\u89C8\u5668\u6062\u590D\u672A\u53D1\u9001\u7684\u586B\u5199",detail:"\u6062\u590D\u7684\u53EA\u662F\u8868\u5355\u8F93\u5165\u6570\u636E\uFF1B\u8BF7\u91CD\u65B0\u70B9\u51FB\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u751F\u6210\u8349\u7A3F\uFF0C\u6B64\u524D\u7684\u786E\u8BA4\u72B6\u6001\u4E0D\u4F1A\u6062\u590D\u3002\u6362\u4E00\u4E2A\u6D4F\u89C8\u5668\u4E0D\u4F1A\u5E26\u6765\u8FD9\u4EFD\u8349\u7A3F\u3002"}:null:{kind:"info",title:"\u8BF7\u5148\u5728 AGH \u4E2D\u9009\u62E9\u6216\u521B\u5EFA\u4E00\u4E2A\u4F1A\u8BDD"},busy:!1,polling:!1,lastCheckedAt:null})}dispose(){this.disposed=!0,this.generation+=1,this.stopTimer(),this.listeners.clear()}updateForm(e){if(this.disposed)return;let t=Yi(e),i=this.snapshot.card,s=this.snapshot,r=s.sent!==null||i!==null||s.confirmation!==null||s.busy||s.polling||s.phase==="sending"||s.phase==="confirming"||s.phase==="awaiting-draft"||s.phase==="awaiting-commit";this.token+=1,this.stopTimer(),this.pollKind=null;let a=s.sent!==null||s.confirmation!==null;this.update({form:e,validation:t,cardExpired:i!==null?!0:s.cardExpired,confirmable:!1,phase:s.phase==="no-session"?"no-session":"editing",busy:!1,polling:!1,status:r?{kind:"warn",title:a?"\u8F93\u5165\u5DF2\u4FEE\u6539\uFF1A\u5148\u524D\u53D1\u9001\u7684\u5185\u5BB9\u5DF2\u4F5C\u5E9F\uFF0C\u786E\u8BA4\u5361\u5DF2\u8FC7\u671F":"\u8F93\u5165\u5DF2\u4FEE\u6539\uFF1A\u5C1A\u672A\u53D1\u9001\u7684\u65E7\u8F93\u5165\u5DF2\u4F5C\u5E9F",detail:a?"\u8BF7\u70B9\u51FB\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u53D1\u9001\u65B0\u7684\u9700\u6C42\u7248\u672C\uFF1B\u5DF2\u53D1\u51FA\u7684\u65E7\u9644\u4EF6\u65E0\u6CD5\u64A4\u56DE\uFF0C\u7A0B\u5E8F\u4EE5\u4F1A\u8BDD\u4E2D\u6700\u65B0\u7684\u8BF7\u6C42\u9644\u4EF6\u4E3A\u51C6\u3002":"\u8BF7\u5B8C\u6210\u4FEE\u6539\u540E\u70B9\u51FB\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u53D1\u9001\u65B0\u7684\u9700\u6C42\u7248\u672C\u3002"}:s.status?.kind==="warn"||s.status?.kind==="error"?null:s.status}),this.saveDraft()}loadDemo(){this.disposed||this.snapshot.phase==="no-session"||(this.updateForm(Eu(this.snapshot.form)),this.update({status:{kind:"info",title:"\u5DF2\u8F7D\u5165\u516C\u5F00\u89C4\u683C\u6F14\u793A\uFF1A\u5382\u5546\u8BBE\u5907\u89C4\u683C\uFF0B\u81EA\u8BBE\u5E95\u5EA7/\u73AF\u5883\uFF0C\u65E0\u5B9E\u7269\u9A8C\u8BC1",detail:"\u8FD9\u4E9B\u6570\u503C\u662F\u53EF\u68C0\u67E5\u7684\u8868\u5355\u503C\uFF0C\u6765\u6E90\u4FDD\u6301\u201C\u8BBE\u8BA1\u5047\u8BBE\uFF08\u975E\u5B9E\u6D4B\uFF09\u201D\uFF1B\u53EF\u81EA\u884C\u4FEE\u6539\u540E\u91CD\u65B0\u70B9\u51FB\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u3002"}}))}sendBlockedReason(){return this.snapshot.sessionKey?this.snapshot.busy?null:!this.commands.prompt&&!this.commands.followUp?{kind:"error",title:"\u5F53\u524D\u5BBF\u4E3B\u672A\u63D0\u4F9B\u4F1A\u8BDD\u547D\u4EE4\uFF0C\u65E0\u6CD5\u53D1\u9001\u8F93\u5165",detail:"\u672C\u9762\u677F\u53EA\u901A\u8FC7\u5BBF\u4E3B\u4F1A\u8BDD\u7684\u6B63\u5F0F\u547D\u4EE4\u53D1\u9001\u771F\u5B9E\u7528\u6237\u6D88\u606F\uFF0C\u4E0D\u4F1A\u7ED5\u8FC7\u5BBF\u4E3B\u76F4\u63A5\u8C03\u7528\u540E\u7AEF\u3002",code:"SESSION_COMMANDS_UNAVAILABLE"}:null:{kind:"info",title:"\u8BF7\u5148\u5728 AGH \u4E2D\u9009\u62E9\u6216\u521B\u5EFA\u4E00\u4E2A\u4F1A\u8BDD"}}async send(e,t,i,s){let r=!1;try{r=await this.isBusy()}catch{r=!1}if(!this.isCurrent(t,i))return;let a=r?this.commands.followUp:this.commands.prompt;if(!a)throw new ln("SESSION_COMMANDS_UNAVAILABLE","\u5F53\u524D Host \u672A\u63D0\u4F9B\u4F1A\u8BDD\u547D\u4EE4");let o=a(e);s(),await o}async submitRequest(){if(this.disposed||this.snapshot.busy)return;if(this.snapshot.phase==="awaiting-draft"&&this.snapshot.sent){this.refresh();return}let e=this.sendBlockedReason();if(e){this.update({status:e});return}let t=this.snapshot.form,i=Yi(t);if(!i.ok&&!i.canSubmitForClarification){this.update({validation:i,status:{kind:"error",title:`\u8868\u5355\u8FD8\u6709 ${i.issues.length} \u9879\u5F85\u4FEE\u6B63\uFF0C\u5C1A\u672A\u53D1\u9001`,detail:i.issues[0]?.message}});return}let s=this.generation,r=++this.token;this.update({busy:!0,phase:"sending",status:{kind:"pending",title:"\u6B63\u5728\u901A\u8FC7\u4F1A\u8BDD\u53D1\u9001\u8BF7\u6C42\u9644\u4EF6\u2026"}});try{let a=this.snapshot.sent,o=a?.requestId??this.newRequestId(),l=a?.revision??1,c=fl(t,{requestId:o,revision:l}),u=await kr(c);if(a&&u.sha256!==a.sha256&&(l+=1,c=fl(t,{requestId:o,revision:l}),u=await kr(c)),!this.isCurrent(s,r))return;let d={requestId:o,revision:l,sha256:u.sha256,base64:u.base64,byteLength:u.byteLength,sentAt:this.now()},h=[pl(ul,hl,u.base64),{type:"text",text:yu({requestId:o,revision:l})}];this.send(h,s,r,()=>{this.update({sent:d,card:null,cardExpired:!1,confirmable:!1,confirmation:null,frozen:null,phase:"awaiting-draft",busy:!1,status:{kind:"pending",title:"\u5DF2\u53D1\u9001\u8BF7\u6C42\u9644\u4EF6\uFF0C\u7B49\u5F85\u7A0B\u5E8F\u767B\u8BB0\u8349\u7A3F\u2026",detail:`\u9700\u6C42\u7248\u672C ${l}`}}),this.clearDraft(),this.startPolling("draft",r)}).catch(m=>this.onSendFailure(s,r,m))}catch(a){if(!this.isCurrent(s,r))return;let{message:o,code:l}=Zi(a);this.update({busy:!1,phase:"editing",status:{kind:"error",title:`\u53D1\u9001\u5931\u8D25\uFF1A${o}`,...l?{code:l}:{}}})}}onSendFailure(e,t,i){if(!this.isCurrent(e,t))return;let s=this.snapshot.phase;if(s==="awaiting-commit"){let{message:o,code:l}=Zi(i);this.update({status:{kind:"warn",title:`\u786E\u8BA4\u6D88\u606F\u7684\u56DE\u5408\u4EE5\u5931\u8D25\u7ED3\u675F\uFF1A${o}`,detail:"\u82E5\u7A0B\u5E8F\u5B9E\u9645\u6536\u5230\u786E\u8BA4\u5E76\u51BB\u7ED3\uFF0C\u767B\u8BB0\u72B6\u6001\u7A0D\u540E\u4F1A\u663E\u793A\u7ED3\u679C\uFF1B\u53EF\u70B9\u201C\u5237\u65B0\u72B6\u6001\u201D\u89C2\u5BDF\u3002",...l?{code:l}:{}}});return}if(s==="confirming"){let{message:o,code:l}=Zi(i);this.update({busy:!1,phase:"draft",status:{kind:"error",title:`\u786E\u8BA4\u53D1\u9001\u672A\u6210\u529F\uFF1A${o}`,...l?{code:l}:{}}});return}if(s!=="sending"&&s!=="awaiting-draft")return;let{message:r,code:a}=Zi(i);this.stopTimer(),this.pollKind=null,this.update({busy:!1,polling:!1,phase:"editing",status:{kind:"error",title:`\u53D1\u9001\u672A\u786E\u8BA4\u6210\u529F\uFF1A${r}`,detail:"\u8868\u5355\u5185\u5BB9\u5DF2\u4FDD\u7559\u3002\u82E5\u540E\u53F0\u5B9E\u9645\u6536\u5230\u4E86\u9644\u4EF6\uFF0C\u4F1A\u8BDD\u4E2D\u7684\u6700\u65B0\u8F93\u5165\u4ECD\u4EE5\u9644\u4EF6\u5B57\u8282\u4E3A\u51C6\u3002",...a?{code:a}:{}}})}async confirm(){if(this.disposed||this.snapshot.busy)return;let e=this.snapshot,t=e.sent,i=e.card;if(e.phase!=="draft"||!e.confirmable||!t||!i){e.phase==="draft"&&i&&i.outcome!=="READY_TO_CONFIRM"&&this.update({status:{kind:"warn",title:"\u5F53\u524D\u8349\u7A3F\u8FD8\u4E0D\u80FD\u786E\u8BA4",detail:"\u201C\u8F93\u5165\u5B8C\u6574\u4E00\u81F4\u201D\u53EA\u8868\u793A\u53EF\u4EE5\u6838\u5BF9\u786E\u8BA4\uFF0C\u4E0D\u8868\u793A\u6709\u89E3\u6216\u5DF2\u901A\u8FC7\uFF1B\u8BF7\u5148\u6309\u95EE\u9898\u8865\u9F50\u8F93\u5165\u3002"}});return}let s=this.sendBlockedReason();if(s){this.update({status:s});return}let r=this.generation,a=++this.token;this.update({busy:!0,phase:"confirming",status:{kind:"pending",title:"\u6B63\u5728\u6838\u5BF9\u5F53\u524D\u8349\u7A3F\u2026"}});try{let o=await this.readIntake({request_id:t.requestId});if(!this.isCurrent(r,a))return;if(!o.found){this.update({busy:!1,phase:"editing",confirmable:!1,cardExpired:!0,status:{kind:"warn",title:"\u5C1A\u672A\u767B\u8BB0\u4E0E\u672C\u8F6E\u53D1\u9001\u4E00\u81F4\u7684\u8349\u7A3F",detail:`\u670D\u52A1\u72B6\u6001\uFF1A${o.reason}\uFF08${o.message}\uFF09\uFF1B\u672A\u751F\u6210\u786E\u8BA4\u6587\u4EF6\u3002`,code:o.reason}});return}let l=this.inspectFinalRead(t,i,o);if(l){this.stopTimer(),this.pollKind=null,this.update({busy:!1,polling:!1,phase:"editing",confirmable:!1,cardExpired:!0,sent:l.drift?this.adoptServiceRevision(t,o):t,status:{kind:"warn",title:l.message,detail:"\u672A\u751F\u6210\u786E\u8BA4\u6587\u4EF6\uFF1B\u8BF7\u91CD\u65B0\u70B9\u51FB\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u3002"}});return}let c={requestId:o.requestId,requestRevision:o.requestRevision,draftHash:o.draftHash,requestAttachmentRef:o.attachmentRef,requestAttachmentSha256:o.attachmentSha256},u=Mu(c),d=await kr(u);if(!this.isCurrent(r,a))return;let h=[pl(Lr,hl,d.base64),{type:"text",text:bu({requestId:c.requestId,requestRevision:c.requestRevision,draftHash:c.draftHash,requestAttachmentRef:c.requestAttachmentRef,requestAttachmentSha256:c.requestAttachmentSha256,confirmationSha256:d.sha256})}];this.send(h,r,a,()=>{this.update({confirmation:{sha256:d.sha256,base64:d.base64,byteLength:d.byteLength,sentAt:this.now(),identity:c},phase:"awaiting-commit",busy:!1,status:{kind:"pending",title:"\u786E\u8BA4\u5DF2\u53D1\u9001\uFF1A\u7A0D\u540E\u4F1A\u51FA\u73B0\u5BBF\u4E3B\u5BA1\u6279\uFF08\u7B2C\u4E8C\u9053\uFF09\uFF1B\u7B49\u5F85\u7A0B\u5E8F\u767B\u8BB0\u51BB\u7ED3\u7ED3\u679C\u2026"}}),this.startPolling("commit",a)}).catch(m=>this.onSendFailure(r,a,m))}catch(o){if(!this.isCurrent(r,a))return;let{message:l,code:c}=Zi(o);this.update({busy:!1,phase:"draft",status:{kind:"error",title:`\u786E\u8BA4\u5931\u8D25\uFF1A${l}`,code:c}})}}inspectFinalRead(e,t,i){return i.requestId!==e.requestId?{message:`\u67E5\u8BE2\u670D\u52A1\u8FD4\u56DE\u7684\u662F\u53E6\u4E00\u4E2A\u8BF7\u6C42\uFF08${i.requestId}\uFF09\uFF0C\u672C\u9762\u677F\u4E0D\u4F1A\u628A\u5B83\u5F53\u4F5C\u5F53\u524D\u8349\u7A3F`,drift:!0}:i.requestRevision!==e.revision||i.attachmentSha256!==e.sha256?{message:`\u4F1A\u8BDD\u4E2D\u7684\u5F53\u524D\u8BF7\u6C42\u5DF2\u66F4\u65B0\uFF08\u9700\u6C42\u7248\u672C ${i.requestRevision}\uFF09\uFF0C\u4E0E\u672C\u9762\u677F\u53D1\u9001\u7684\u8F93\u5165\u4E0D\u4E00\u81F4\uFF1B\u65E7\u8F93\u5165\u4E0D\u80FD\u88AB\u786E\u8BA4`,drift:!0}:i.outcome!=="READY_TO_CONFIRM"?{message:`\u5F53\u524D\u8349\u7A3F\u72B6\u6001\u5DF2\u53D8\u4E3A\u201C${xf[i.outcome]??i.outcome}\u201D\uFF0C\u4E0D\u80FD\u786E\u8BA4`,drift:!1}:i.attachmentRef!==t.attachmentRef?{message:"\u5F53\u524D\u8BF7\u6C42\u9644\u4EF6\u7684\u5F15\u7528\u4E0E\u663E\u793A\u5361\u7247\u4E0D\u4E00\u81F4\uFF1B\u4E0D\u80FD\u786E\u8BA4",drift:!1}:i.draftHash!==t.draftHash?{message:"\u5F53\u524D\u8349\u7A3F\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u518D\u51B3\u5B9A",drift:!1}:null}adoptServiceRevision(e,t){return{...e,revision:Math.max(e.revision,t.requestRevision),sha256:""}}stopTimer(){this.timer!==null&&(this.clearTimer(this.timer),this.timer=null)}startPolling(e,t){this.stopTimer(),this.pollKind=e,this.pollToken=t,this.pollStartedAt=this.now(),this.update({polling:!0}),this.schedulePoll()}schedulePoll(){this.disposed||this.pollKind===null||(this.timer=this.setTimer(()=>{this.timer=null,this.pollTick()},this.intervalMs))}async pollTick(){if(this.disposed||this.pollKind===null)return;let e=this.pollKind,t=this.pollToken,i=await this.readOnce(e,t);if(!(!this.isCurrent(this.generation,t)||this.pollKind!==e)){if(i==="settled"){this.pollKind=null,this.update({polling:!1});return}if(this.now()-this.pollStartedAt>=this.timeoutMs){this.pollKind=null,this.update({polling:!1,status:{kind:"warn",title:e==="draft"?"\u7B49\u5F85\u7A0B\u5E8F\u767B\u8BB0\u8D85\u65F6":"\u5C1A\u672A\u89C2\u5BDF\u5230\u51BB\u7ED3\u7ED3\u679C",detail:e==="draft"?"\u767B\u8BB0\u72B6\u6001\u8FD8\u6CA1\u6709\u7ED9\u51FA\u4E0E\u672C\u9762\u677F\u53D1\u9001\u5B57\u8282\u5B8C\u5168\u4E00\u81F4\u7684\u8349\u7A3F\uFF1B\u53EF\u7A0D\u540E\u70B9\u201C\u5237\u65B0\u72B6\u6001\u201D\uFF0C\u6216\u91CD\u65B0\u70B9\u51FB\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u3002":"\u786E\u8BA4\u5DF2\u53D1\u51FA\uFF0C\u4F46\u767B\u8BB0\u72B6\u6001\u5C1A\u672A\u51FA\u73B0\u5BF9\u5E94\u4EFB\u52A1\u4FEE\u8BA2\uFF1B\u63D0\u4EA4\u65F6\u7684\u771F\u5B9E\u91CD\u626B\u4ECD\u662F\u6700\u7EC8\u8FB9\u754C\uFF0C\u7A0D\u540E\u53EF\u5237\u65B0\u72B6\u6001\u3002"}});return}this.schedulePoll()}}async refresh(){if(this.disposed||!this.snapshot.sessionKey||this.pollKind!==null&&this.pollTimerActive())return;if(this.readInFlight)return this.readInFlight;let e=this.snapshot.phase,t=this.pollKind??(e==="awaiting-commit"||e==="committed"?"commit":(e==="draft"||e==="awaiting-draft")&&this.snapshot.sent?"draft":null);if(!t)return;let i=this.readOnce(t,this.token).then(s=>{s==="settled"&&this.pollKind===t&&(this.pollKind=null,this.update({polling:!1}))});this.readInFlight=i;try{await i}finally{this.readInFlight===i&&(this.readInFlight=null)}}pollTimerActive(){return this.timer!==null}async readIntake(e={}){let t=await this.call(vu,{session_key:this.snapshot.sessionKey,...e});return Su(t)}async readOnce(e,t){let i=this.snapshot.sent;if(!i)return"settled";try{let s=await this.readIntake({request_id:i.requestId});return this.isCurrent(this.generation,t)?(this.update({lastCheckedAt:this.now()}),s.found?e==="draft"?this.handleDraftPayload(i,s):this.handleCommitPayload(s):yf.has(s.reason)?"waiting":(this.update({status:{kind:"error",title:"\u67E5\u8BE2\u670D\u52A1\u62A5\u544A\u7684\u767B\u8BB0\u72B6\u6001\u5F02\u5E38\uFF0C\u6682\u4E0D\u80FD\u6838\u5BF9\u8349\u7A3F",detail:`${s.reason}\uFF1A${s.message}`,code:s.reason}}),"settled")):"settled"}catch(s){if(!this.isCurrent(this.generation,t))return"settled";let{message:r,code:a}=Zi(s);return this.update({status:{kind:"error",title:`\u6682\u65F6\u8BFB\u4E0D\u5230\u8349\u7A3F\u72B6\u6001\uFF1A${r}`,detail:"\u672A\u89C2\u5BDF\u5230\u53EF\u6838\u5BF9\u7684\u72B6\u6001\uFF1B\u7A0D\u540E\u5C06\u91CD\u8BD5\u6216\u8BF7\u624B\u52A8\u5237\u65B0\u3002",...a?{code:a}:{}}}),"waiting"}}handleDraftPayload(e,t){if(t.requestId!==e.requestId)return this.update({status:{kind:"warn",title:"\u4F1A\u8BDD\u4E2D\u767B\u8BB0\u7684\u8349\u7A3F\u6765\u81EA\u53E6\u4E00\u4EFD\u8BF7\u6C42\uFF0C\u672C\u9762\u677F\u4E0D\u4F1A\u663E\u793A\u4E3A\u53EF\u786E\u8BA4"}}),"settled";if(t.requestRevision<e.revision&&this.snapshot.phase==="awaiting-draft")return this.update({confirmable:!1,status:{kind:"pending",title:`\u7B49\u5F85\u7A0B\u5E8F\u6574\u7406\u672C\u6B21\u9700\u6C42\u7248\u672C ${e.revision}\u2026`,detail:`\u67E5\u8BE2\u670D\u52A1\u6682\u65F6\u4ECD\u662F\u8F83\u65E9\u7248\u672C ${t.requestRevision}\uFF1B\u4E0D\u4F1A\u7528\u65E7\u8349\u7A3F\u66FF\u4EE3\u672C\u6B21\u8F93\u5165\u6216\u7528\u4E8E\u786E\u8BA4\u3002`}}),"waiting";if(t.requestRevision!==e.revision||t.attachmentSha256!==e.sha256)return this.update({phase:"editing",confirmable:!1,cardExpired:this.snapshot.card!==null,confirmation:null,frozen:null,sent:this.adoptServiceRevision(e,t),status:{kind:"warn",title:`\u4F1A\u8BDD\u4E2D\u7684\u5F53\u524D\u9700\u6C42\u5DF2\u66F4\u65B0\u4E3A\u7248\u672C ${t.requestRevision}\uFF08\u6216\u9644\u4EF6\u5B57\u8282\u4E0D\u4E00\u81F4\uFF09`,detail:"\u672C\u9762\u677F\u663E\u793A\u7684\u672C\u8F6E\u8F93\u5165\u5DF2\u88AB\u66F4\u65B0\u7684\u8F93\u5165\u53D6\u4EE3\uFF1B\u4E0D\u4F1A\u663E\u793A\u4E3A\u53EF\u786E\u8BA4\uFF0C\u8BF7\u4FEE\u6539\u540E\u91CD\u65B0\u6574\u7406\u3002"}}),"settled";let i={requestId:t.requestId,requestRevision:t.requestRevision,outcome:t.outcome,stagedAt:t.stagedAt,attachmentRef:t.attachmentRef,attachmentSha256:t.attachmentSha256,draftHash:t.draftHash,draft:t.draft,deviceCard:t.deviceCard,task:t.task,notes:t.notes},s=this.snapshot.card,r=s!==null&&s.draftHash!==t.draftHash,a=vf[t.outcome]??{kind:"warn",title:`\u672A\u77E5\u8349\u7A3F\u72B6\u6001\uFF1A${t.outcome}`};return this.update({phase:"draft",card:i,cardExpired:!1,busy:!1,confirmable:t.outcome==="READY_TO_CONFIRM",...r?{confirmation:null,frozen:null}:{},status:{kind:a.kind,title:a.title,detail:t.outcome==="READY_TO_CONFIRM"?r?"\u7A0B\u5E8F\u5DF2\u6309\u5F53\u524D\u8F93\u5165\u91CD\u65B0\u7F16\u8BD1\u8349\u7A3F\uFF08draft_hash \u53D8\u5316\uFF09\uFF1B\u5148\u524D\u5BF9\u8BE5\u8349\u7A3F\u7684\u786E\u8BA4/\u51BB\u7ED3\u5DF2\u4F5C\u5E9F\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9\u5F53\u524D\u8349\u7A3F\u3002":"\u201C\u8F93\u5165\u5B8C\u6574\u4E00\u81F4\u201D\u53EA\u8868\u793A\u53EF\u4EE5\u6838\u5BF9\u786E\u8BA4\uFF0C\u4E0D\u8868\u793A\u6709\u89E3\u6216\u5DF2\u901A\u8FC7\u9A8C\u8BC1\u3002":"\u8BF7\u6309\u4E0B\u65B9\u7A0B\u5E8F\u7ED9\u51FA\u7684\u7F3A\u5931/\u51B2\u7A81\u4FEE\u6539\u8F93\u5165\uFF0C\u7136\u540E\u91CD\u65B0\u70B9\u51FB\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\uFF08\u4F1A\u751F\u6210\u65B0\u7684\u9700\u6C42\u7248\u672C\uFF09\u3002"}}),"settled"}handleCommitPayload(e){let t=this.snapshot.confirmation;if(!t)return"settled";if(e.draftHash!==t.identity.draftHash)return this.stopTimer(),this.pollKind=null,this.update({phase:"editing",polling:!1,confirmable:!1,cardExpired:this.snapshot.card!==null,confirmation:null,frozen:null,status:{kind:"warn",title:"\u8349\u7A3F\u5728\u786E\u8BA4\u540E\u5DF2\u91CD\u65B0\u7F16\u8BD1\uFF08draft_hash \u53D8\u5316\uFF09\uFF0C\u5148\u524D\u786E\u8BA4\u4F5C\u5E9F",detail:"\u65E7\u7684\u786E\u8BA4\u6587\u4EF6\u4E0D\u518D\u5BF9\u5E94\u5F53\u524D\u8349\u7A3F\uFF1B\u8BF7\u91CD\u65B0\u6574\u7406\u5E76\u6838\u5BF9\u5F53\u524D\u8349\u7A3F\u540E\u518D\u786E\u8BA4\u3002"}}),"settled";let i=e.task.revisions.find(s=>s.requestRevision===t.identity.requestRevision&&s.draftHash===t.identity.draftHash);return i?(this.update({phase:"committed",frozen:{taskId:e.task.taskId,revision:i.revision},status:{kind:"info",title:`\u7A0B\u5E8F\u5DF2\u767B\u8BB0\u51BB\u7ED3\uFF1A\u4EFB\u52A1\u4FEE\u8BA2 ${i.revision??"\u672A\u77E5"}`,detail:"\u8BE5\u7ED3\u679C\u6765\u81EA\u53EA\u8BFB\u767B\u8BB0\u67E5\u8BE2\uFF1B\u51E0\u4F55\u8FD0\u884C\u4E0E\u9A8C\u8BC1\u8BF7\u7EE7\u7EED\u5728\u4E0B\u65B9\u6216\u5BF9\u8BDD\u4E2D\u63A8\u8FDB\uFF08\u4EFB\u52A1\u8EAB\u4EFD\u89C1\u8BCA\u65AD\u533A\uFF09\u3002"}}),this.clearDraft(),"settled"):"waiting"}};import{useEffect as xl,useRef as bf,useState as wu,useSyncExternalStore as Sf}from"react";import{jsx as z,jsxs as $}from"react/jsx-runtime";var yl=n=>Number.isInteger(n)?String(n):n.toFixed(3).replace(/0+$/,"").replace(/\.$/,""),Mf={READY_TO_CONFIRM:"fp-outcome-ready",NEEDS_INPUT:"fp-outcome-needs",CONFLICTING_INPUT:"fp-outcome-conflict",UNSUPPORTED_REQUEST:"fp-outcome-unsupported"},Ef=new Set(["sending","awaiting-draft","draft","confirming","awaiting-commit"]);function bl({controller:n,sessionKey:e,disabled:t,hasRun:i,collapsedOverride:s,onCollapsedChange:r,compact:a=!1}){let o=Sf(n.subscribe,n.getSnapshot),l=bf(null),[c,u]=wu(null),[d,h]=wu(null);xl(()=>u(null),[e]),xl(()=>{o.card&&!o.cardExpired&&u(3),o.card&&!o.cardExpired&&l.current?.scrollTo({top:0})},[o.card,o.cardExpired]),xl(()=>h(null),[e]);let p=Ef.has(o.phase)||o.busy,m=r?s:d,y=r??h;if(!p&&(m??i))return $("section",{className:a?"fp-intake-inline":"fp-region fp-region-intake fp-intake-collapsed","data-fitplate":"intake-region","data-collapsed":"true",children:[a?null:z("h2",{children:"\u8F93\u5165\u4E0E\u786E\u8BA4"}),o.status&&(o.status.kind==="warn"||o.status.kind==="error"||o.status.kind==="pending")?z(Au,{status:o.status}):null,a?null:z("p",{className:"fp-muted",children:"\u5F53\u524D\u7ED3\u8BBA\u4EC5\u9002\u7528\u4E8E\u5DF2\u786E\u8BA4\u8F93\u5165\uFF1B\u7F16\u8F91\u540E\u9700\u91CD\u65B0\u786E\u8BA4\u3002"}),z("button",{type:"button","data-fitplate":"intake-expand",onClick:()=>y(!1),children:a?"\u7F16\u8F91\u8F93\u5165":"\u5C55\u5F00\u8F93\u5165\uFF08\u7F16\u8F91\u65B0\u8BF7\u6C42\uFF09"})]});let f=o.form,M=b=>{let T=dl(f);b(T),n.updateForm(T)},C=f.unit,S=(b,T,k)=>z("input",{className:"fp-intake-num",inputMode:"decimal",value:b,disabled:t,"aria-label":k,onChange:V=>T(V.target.value)}),E=(b,T,k)=>$("span",{className:"fp-intake-length",children:[z("input",{className:"fp-intake-num",inputMode:"decimal",value:b,disabled:t,"aria-label":k,onChange:V=>T(V.target.value)}),z("span",{className:"fp-intake-unit",children:C})]}),w=o.card,I=c??(f.deviceCardId||w?3:-1),v=o.busy||o.polling,R=!!(w&&!o.cardExpired&&I===3),D=["\u8BBE\u5907\u4E0E\u677F\u5C3A\u5BF8","\u5B89\u88C5\u5B54\u4E0E\u79FB\u52A8\u8303\u56F4","\u5468\u56F4\u7A7A\u95F4\u4E0E\u8981\u6C42","\u6838\u5BF9\u5E76\u5F00\u59CB"],O=b=>{u(b),l.current?.scrollTo({top:0})},P=()=>{n.loadDemo(),O(3)},X=o.phase==="no-session"?"\u8BF7\u5148\u5728\u5DE6\u4FA7\u9009\u62E9 FitPlate \u4F53\u9A8C\u4F1A\u8BDD\u3002":o.phase==="sending"?"\u6B63\u5728\u53D1\u9001\u8981\u6C42\uFF0C\u8BF7\u7A0D\u5019\u3002":o.phase==="awaiting-draft"?"AI \u6B63\u5728\u68C0\u67E5\u8981\u6C42\u3002\u82E5\u4E0A\u65B9\u51FA\u73B0\u6743\u9650\u5361\uFF0C\u8BF7\u6838\u5BF9\u5DE5\u5177\u540E\u70B9 Allow once\uFF08\u5141\u8BB8\u4E00\u6B21\uFF09\u3002":o.phase==="confirming"?"\u6B63\u5728\u6838\u5BF9\u672C\u6B21\u786E\u8BA4\uFF0C\u8BF7\u7A0D\u5019\u3002\u6838\u5BF9\u901A\u8FC7\u540E\u4F1A\u5F00\u59CB\u8BBE\u8BA1\u3002":o.phase==="awaiting-commit"?"\u786E\u8BA4\u5DF2\u53D1\u51FA\uFF0C\u6B63\u5728\u5F00\u59CB\u8BBE\u8BA1\u3002\u82E5\u4E0A\u65B9\u51FA\u73B0\u6743\u9650\u5361\uFF0C\u8BF7\u6838\u5BF9\u540E\u5141\u8BB8\u4E00\u6B21\uFF0C\u65E0\u9700\u91CD\u590D\u70B9\u51FB\u3002":R?o.confirmable?"\u8BF7\u6838\u5BF9\u4E0B\u65B9\u6761\u4EF6\uFF1B\u65E0\u8BEF\u540E\u70B9\u300C\u786E\u8BA4\u6761\u4EF6\uFF0C\u5F00\u59CB\u8BBE\u8BA1\u300D\u3002\u8F93\u5165\u5B8C\u6574\u4E0D\u4EE3\u8868\u8BBE\u8BA1\u5DF2\u901A\u8FC7\u3002":"\u8FD9\u4E9B\u8981\u6C42\u8FD8\u4E0D\u80FD\u5F00\u59CB\u8BBE\u8BA1\u3002\u8BF7\u6309\u4E0B\u65B9\u95EE\u9898\u4FEE\u6539\uFF0C\u518D\u91CD\u65B0\u68C0\u67E5\u3002":I===3?"\u6838\u5BF9\u8FD9\u4E9B\u8F93\u5165\uFF0C\u7136\u540E\u8BA9 AI \u68C0\u67E5\u8981\u6C42\u3002AI \u4F1A\u5728\u4F60\u5141\u8BB8\u7684\u8303\u56F4\u5185\u9009\u62E9\u4F4D\u7F6E\u3002":"\u6309\u6B65\u9AA4\u63D0\u4F9B\u5DF2\u6709\u5C3A\u5BF8\uFF1B\u6CA1\u6709\u6D4B\u91CF\u7684\u6570\u636E\u8BF7\u7559\u7A7A\u5E76\u8BF4\u660E\uFF0C\u4E0D\u9700\u8981\u731C\u6570\u503C\u3002";return $("section",{ref:l,className:"fp-region fp-region-intake fp-guided-intake","data-fitplate":"intake-region","data-collapsed":"false","data-input-step":I,"data-input-waiting":v?"true":"false",children:[$("div",{className:"fp-guide-heading",children:[$("div",{children:[z("span",{className:"fp-eyebrow",children:"\u5B89\u88C5\u677F\u8BBE\u8BA1\u52A9\u624B"}),z("h2",{children:I<0?"\u5148\u4F53\u9A8C\u4E00\u6B21\uFF0C\u6216\u586B\u5199\u81EA\u5DF1\u7684\u8981\u6C42":v?"AI \u6B63\u5728\u5904\u7406\uFF0C\u8BF7\u67E5\u770B\u5F53\u524D\u8FDB\u5EA6":R?"\u8BF7\u786E\u8BA4\u8FD9\u6B21\u8BBE\u8BA1\u7684\u6761\u4EF6":D[I]})]}),i?z("button",{type:"button","data-fitplate":"intake-collapse",onClick:()=>y(!0),children:"\u8FD4\u56DE\u5DF2\u6709\u7ED3\u679C"}):null]}),I<0?$("div",{className:"fp-welcome","data-fitplate":"welcome",children:[z("p",{children:"\u628A\u4F20\u611F\u5668\u88C5\u5230\u677F\u4E0A\uFF1A\u4F60\u63D0\u4F9B\u5C3A\u5BF8\u4E0E\u9650\u5236\uFF0CAI \u9009\u62E9\u4F4D\u7F6E\u3001\u751F\u6210\u6A21\u578B\u3001\u68C0\u67E5\u78B0\u649E\uFF0C\u5E76\u5728\u5141\u8BB8\u8303\u56F4\u5185\u4FEE\u6B63\u3002"}),$("div",{className:"fp-start-options",children:[$("button",{type:"button",className:"fp-start-card fp-start-recommended","data-fitplate":"intake-demo",disabled:t,onClick:P,children:[z("strong",{children:"\u7528\u793A\u4F8B\u4F53\u9A8C"}),z("span",{children:"\u65E0\u9700\u5148\u586B\u5199\u53C2\u6570\u3002\u6838\u5BF9\u793A\u4F8B\u6761\u4EF6\u540E\uFF0C\u8D70\u4E00\u6B21\u771F\u5B9E\u8BBE\u8BA1\u6D41\u7A0B\u3002"}),z("small",{children:"\u5382\u5546\u8BBE\u5907\u89C4\u683C + \u81EA\u8BBE\u73AF\u5883\uFF0C\u672A\u505A\u5B9E\u7269\u9A8C\u8BC1"})]}),$("button",{type:"button",className:"fp-start-card","data-fitplate":"intake-custom",disabled:t,onClick:()=>O(0),children:[z("strong",{children:"\u586B\u5199\u6211\u7684\u5B89\u88C5\u8981\u6C42"}),z("span",{children:"\u5206\u4E09\u6B65\u586B\u5199\u5C3A\u5BF8\u3001\u5B89\u88C5\u8303\u56F4\u548C\u5468\u56F4\u969C\u788D\u3002"}),z("small",{children:"\u76EE\u524D\u652F\u6301 Banner Q20PD \u8BBE\u5907\u4E0E\u77E9\u5F62\u677F"})]})]}),z("p",{className:"fp-muted",children:"\u6D41\u7A0B\uFF1A\u68C0\u67E5\u8981\u6C42 \u2192 \u4F60\u786E\u8BA4\u6761\u4EF6 \u2192 AI \u5EFA\u6A21\u4E0E\u9A8C\u8BC1 \u2192 \u67E5\u770B\u548C\u4E0B\u8F7D\u7ED3\u679C\u3002"})]}):z("nav",{className:"fp-input-steps","aria-label":"\u586B\u5199\u6B65\u9AA4",children:D.map((b,T)=>$("button",{type:"button","aria-current":I===T?"step":void 0,disabled:v,"data-fitplate":`input-step-${T}`,onClick:()=>O(T),children:[z("b",{children:T+1}),b]},b))}),I>=0?z("p",{className:"fp-next-action",role:"status","data-fitplate":"next-action",children:X}):null,o.status&&I>=0?z(Au,{status:o.status}):null,w&&I===3?z(Rf,{card:w,snapshot:o,onConfirm:()=>{n.confirm()}}):null,I===3&&!R?z(Tf,{form:f,onEdit:O}):null,$("div",{className:"fp-intake-toolbar",children:[$("label",{className:"fp-intake-common-unit",children:["\u7EDF\u4E00\u5355\u4F4D",z("select",{value:C,disabled:t,"aria-label":"\u7EDF\u4E00\u5355\u4F4D",onChange:b=>{let T=b.target.value;M(k=>{k.unit=T})},children:ll.map(b=>z("option",{value:b,children:b},b))})]}),z("span",{className:"fp-muted",children:"\u5207\u6362\u5355\u4F4D\u4F1A\u91CD\u65B0\u89E3\u91CA\u5DF2\u586B\u6570\u5B57\uFF0C\u8BF7\u5148\u9009\u597D\u5355\u4F4D\u3002"}),I>=0&&!v&&!f.deviceCardId?z("button",{type:"button","data-fitplate":"intake-demo",onClick:P,children:"\u8F7D\u5165\u516C\u5F00\u89C4\u683C\u6F14\u793A"}):null]}),$("fieldset",{className:"fp-intake-fieldset","data-form-step":"0",children:[z("legend",{children:"\u9700\u6C42\u4E0E\u8BBE\u5907"}),z("p",{className:"fp-field-help",children:"\u9009\u62E9\u5F53\u524D\u652F\u6301\u7684\u8BBE\u5907\u3002\u7528\u4E00\u53E5\u8BDD\u8BF4\u660E\u5B89\u88C5\u76EE\u6807\uFF1B\u7CBE\u786E\u5C3A\u5BF8\u586B\u5199\u5728\u4E0B\u65B9\u3002"}),$("div",{className:"fp-intake-rows",children:[$("label",{className:"fp-intake-wide",children:["\u8FD9\u6B21\u60F3\u5B8C\u6210\u4EC0\u4E48\uFF1F",z("textarea",{rows:2,maxLength:4e3,value:f.text,disabled:t,"data-fitplate":"intake-text",placeholder:"\u4F8B\u5982\uFF1A\u5728\u5141\u8BB8\u8303\u56F4\u5185\u9009\u62E9\u5408\u9002\u7684\u5B89\u88C5\u4F4D\u7F6E\uFF0C\u6EE1\u8DB3\u95F4\u9699\u4E0E\u5B54\u8FB9\u6750\u6599\u8981\u6C42\u3002",onChange:b=>{let T=b.target.value;M(k=>{k.text=T})}})]}),$("label",{children:["\u8981\u5B89\u88C5\u7684\u8BBE\u5907",$("select",{value:f.deviceCardId,disabled:t,"data-fitplate":"intake-card-select",onChange:b=>{let T=b.target.value;M(k=>{k.deviceCardId=T})},children:[z("option",{value:"",children:"\uFF08\u8BF7\u9009\u62E9\uFF09"}),zs.map(b=>z("option",{value:b.id,children:b.name},b.id))]})]})]}),f.deviceCardId?z(wf,{cardId:f.deviceCardId}):null]}),$("fieldset",{className:"fp-intake-fieldset","data-form-step":"0",children:[z("legend",{children:"\u677F\u4F53"}),z("p",{className:"fp-field-help",children:"\u4ECE\u4E0A\u65B9\u770B\u677F\uFF1A\u5DE6\u4E0B\u89D2\u4E3A\u539F\u70B9\uFF0CX \u5411\u53F3\u3001Y \u5411\u4E0A\u3002\u677F\u9AD8\u6307\u5E73\u9762\u5185\u7684 Y \u5C3A\u5BF8\uFF0C\u677F\u539A\u6307 Z \u65B9\u5411\u3002"}),$("div",{className:"fp-intake-rows",children:[$("label",{children:["\u677F\u5BBD ",E(f.plate.width,b=>M(T=>T.plate.width=b),"\u677F\u5BBD")]}),$("label",{children:["\u677F\u9AD8 ",E(f.plate.height,b=>M(T=>T.plate.height=b),"\u677F\u9AD8")]}),$("label",{children:["\u677F\u539A ",E(f.plate.thickness,b=>M(T=>T.plate.thickness=b),"\u677F\u539A"),z("span",{className:"fp-intake-lock",children:"\u9501\u5B9A\uFF08\u65B0\u5165\u53E3\u4E0D\u5141\u8BB8\u6539\u677F\u539A\uFF09"})]})]}),$("div",{className:"fp-intake-rows",children:[$("label",{className:"fp-toggle",children:[z("input",{type:"checkbox",checked:f.plate.widthEditable,disabled:t,onChange:b=>{let T=b.target.checked;M(k=>k.plate.widthEditable=T)}}),"\u677F\u5BBD\u5141\u8BB8\u5728\u8303\u56F4\u5185\u8C03\u6574"]}),f.plate.widthEditable?$("span",{className:"fp-intake-range",children:[S(f.plate.widthMin,b=>M(T=>T.plate.widthMin=b),"\u677F\u5BBD\u8BB8\u53EF\u4E0B\u9650"),z("span",{className:"fp-intake-unit",children:C})," \u2264 \u677F\u5BBD \u2264",S(f.plate.widthMax,b=>M(T=>T.plate.widthMax=b),"\u677F\u5BBD\u8BB8\u53EF\u4E0A\u9650"),z("span",{className:"fp-intake-unit",children:C})]}):null]}),$("div",{className:"fp-intake-rows",children:[$("label",{className:"fp-toggle",children:[z("input",{type:"checkbox",checked:f.plate.heightEditable,disabled:t,onChange:b=>{let T=b.target.checked;M(k=>k.plate.heightEditable=T)}}),"\u677F\u9AD8\u5141\u8BB8\u5728\u8303\u56F4\u5185\u8C03\u6574"]}),f.plate.heightEditable?$("span",{className:"fp-intake-range",children:[S(f.plate.heightMin,b=>M(T=>T.plate.heightMin=b),"\u677F\u9AD8\u8BB8\u53EF\u4E0B\u9650"),z("span",{className:"fp-intake-unit",children:C})," \u2264 \u677F\u9AD8 \u2264",S(f.plate.heightMax,b=>M(T=>T.plate.heightMax=b),"\u677F\u9AD8\u8BB8\u53EF\u4E0A\u9650"),z("span",{className:"fp-intake-unit",children:C})]}):null]})]}),$("fieldset",{className:"fp-intake-fieldset","data-form-step":"1",children:[z("legend",{children:"\u5E95\u5EA7\u5B54\uFF08\u51BB\u7ED3\u4E0D\u52A8\uFF09"}),z("p",{className:"fp-field-help",children:"\u8FD9\u4E9B\u662F\u677F\u8FDE\u63A5\u5230\u5E95\u5EA7\u7684\u73B0\u6709\u5B54\u3002\u586B\u5199\u5B54\u4E2D\u5FC3\u8DDD\u5DE6\u8FB9\u3001\u4E0B\u8FB9\u7684\u8DDD\u79BB\uFF1BAI \u4E0D\u4F1A\u79FB\u52A8\u5B83\u4EEC\u3002"}),z("div",{className:"fp-intake-rows",children:$("label",{children:["\u5B54\u5F84 ",E(f.baseHoles.diameter,b=>M(T=>T.baseHoles.diameter=b),"\u5E95\u5EA7\u5B54\u5F84")]})}),$("table",{className:"fp-intake-table",children:[z("thead",{children:$("tr",{children:[z("th",{children:"#"}),z("th",{children:"\u4E2D\u5FC3 X"}),z("th",{children:"\u4E2D\u5FC3 Y"}),z("th",{})]})}),z("tbody",{children:f.baseHoles.centers.map((b,T)=>$("tr",{children:[z("td",{children:T}),z("td",{children:E(b.x,k=>M(V=>V.baseHoles.centers[T].x=k),`\u5B54 ${T} \u4E2D\u5FC3 X`)}),z("td",{children:E(b.y,k=>M(V=>V.baseHoles.centers[T].y=k),`\u5B54 ${T} \u4E2D\u5FC3 Y`)}),z("td",{children:z("button",{type:"button",disabled:t||f.baseHoles.centers.length<=1,onClick:()=>M(k=>{k.baseHoles.centers.splice(T,1)}),children:"\u5220\u9664"})})]},T))})]}),z("button",{type:"button",disabled:t,onClick:()=>M(b=>{b.baseHoles.centers.push({x:"",y:""})}),children:"\u6DFB\u52A0\u5E95\u5EA7\u5B54"})]}),$("fieldset",{className:"fp-intake-fieldset","data-form-step":"1",children:[z("legend",{children:"\u8BBE\u5907\u5B89\u88C5"}),z("p",{className:"fp-field-help",children:"\u8FD9\u91CC\u586B\u5199\u4F20\u611F\u5668\u5141\u8BB8\u5B89\u88C5\u7684\u8303\u56F4\u3002\u5141\u8BB8\u79FB\u52A8\u65F6\u53EA\u9700\u7ED9\u8303\u56F4\uFF0C\u5177\u4F53\u4F4D\u7F6E\u7531 AI \u9009\u62E9\u3002"}),$("div",{className:"fp-intake-rows",children:[$("label",{children:["\u677F\u4FA7\u5B89\u88C5\u901A\u5B54\u76F4\u5F84 ",E(f.mounting.holeDiameter,b=>M(T=>T.mounting.holeDiameter=b),"\u677F\u4FA7\u5B89\u88C5\u5B54\u5F84"),z("span",{className:"fp-muted",children:"\u586B\u6570\u503C\uFF1BM3 \u7B49\u87BA\u7EB9\u89C4\u683C\u4E0D\u662F\u5B54\u5F84"})]}),$("label",{children:["\u65CB\u8F6C",z("input",{value:"0\xB0\uFF08P0 \u56FA\u5B9A\uFF09",readOnly:!0,"aria-label":"\u65CB\u8F6C",className:"fp-intake-num"})]})]}),z("div",{className:"fp-intake-rows",children:$("label",{children:["\u79FB\u52A8\u8BB8\u53EF\uFF08\u4E8B\u5B9E\u6765\u81EA\u672C\u8868\u5355\uFF0C\u52A9\u624B\u4E0D\u5F97\u81C6\u6D4B\uFF09",$("select",{value:f.mounting.licenseMode,disabled:t,"data-fitplate":"intake-license",onChange:b=>{let T=b.target.value;M(k=>k.mounting.licenseMode=T)},children:[z("option",{value:"",children:"\uFF08\u8BF7\u9009\u62E9\uFF09"}),Object.keys(cl).map(b=>z("option",{value:b,children:cl[b]},b))]})]})}),f.mounting.licenseMode==="fixed"?$("div",{className:"fp-intake-rows",children:[$("label",{children:["\u56FA\u5B9A\u4E2D\u5FC3 X ",E(f.mounting.centerX,b=>M(T=>T.mounting.centerX=b),"\u56FA\u5B9A\u4E2D\u5FC3 X")]}),$("label",{children:["\u56FA\u5B9A\u4E2D\u5FC3 Y ",E(f.mounting.centerY,b=>M(T=>T.mounting.centerY=b),"\u56FA\u5B9A\u4E2D\u5FC3 Y")]})]}):null,f.mounting.licenseMode==="x_range"||f.mounting.licenseMode==="xy_range"?z("div",{className:"fp-intake-rows",children:$("span",{className:"fp-intake-range",children:["X \u2208 ",E(f.mounting.xMin,b=>M(T=>T.mounting.xMin=b),"X \u8BB8\u53EF\u4E0B\u9650")," \u2026",E(f.mounting.xMax,b=>M(T=>T.mounting.xMax=b),"X \u8BB8\u53EF\u4E0A\u9650")]})}):null,f.mounting.licenseMode==="y_range"||f.mounting.licenseMode==="xy_range"?z("div",{className:"fp-intake-rows",children:$("span",{className:"fp-intake-range",children:["Y \u2208 ",E(f.mounting.yMin,b=>M(T=>T.mounting.yMin=b),"Y \u8BB8\u53EF\u4E0B\u9650")," \u2026",E(f.mounting.yMax,b=>M(T=>T.mounting.yMax=b),"Y \u8BB8\u53EF\u4E0A\u9650")]})}):null,f.mounting.licenseMode==="x_range"?z("div",{className:"fp-intake-rows",children:$("label",{children:["\u4E2D\u5FC3 Y\uFF08\u56FA\u5B9A\uFF09 ",E(f.mounting.centerY,b=>M(T=>T.mounting.centerY=b),"\u4E2D\u5FC3 Y")]})}):null,f.mounting.licenseMode==="y_range"?z("div",{className:"fp-intake-rows",children:$("label",{children:["\u4E2D\u5FC3 X\uFF08\u56FA\u5B9A\uFF09 ",E(f.mounting.centerX,b=>M(T=>T.mounting.centerX=b),"\u4E2D\u5FC3 X")]})}):null]}),$("fieldset",{className:"fp-intake-fieldset","data-form-step":"2",children:[z("legend",{children:"\u73AF\u5883\uFF08\u663E\u5F0F\u8F93\u5165\uFF1B\u7F3A\u5B57\u6BB5\u4E0D\u7B49\u4E8E\u7A7A\u73AF\u5883\uFF09"}),z("p",{className:"fp-field-help",children:"\u586B\u5199\u677F\u9644\u8FD1\u7684\u7ACB\u67F1\u3001\u87BA\u9489\u5934\u548C\u63A5\u7EBF\u7A7A\u95F4\u3002\u5750\u6807\u5747\u76F8\u5BF9\u677F\u5DE6\u4E0B\u89D2\uFF1B\u53EA\u6709\u786E\u8BA4\u4E0D\u5B58\u5728\u65F6\u624D\u7559\u7A7A\u5217\u8868\u3002"}),$("div",{className:"fp-intake-rows",children:[$("label",{children:["\u73AF\u5883\u6765\u6E90",$("select",{value:f.environment.source,disabled:t,"data-fitplate":"intake-env-source",onChange:b=>{let T=b.target.value;M(k=>k.environment.source=T)},children:[z("option",{value:"",children:"\uFF08\u8BF7\u9009\u62E9\uFF09"}),Bs.map(b=>z("option",{value:b,children:Ii[b]},b))]})]}),$("label",{className:"fp-intake-wide",children:["\u5907\u6CE8\uFF08\u53EF\u9009\uFF0C\u2264300 \u5B57\uFF09",z("input",{value:f.environment.note,maxLength:300,disabled:t,onChange:b=>{let T=b.target.value;M(k=>k.environment.note=T)}})]})]}),z("h3",{children:"\u56FA\u5B9A\u67F1\uFF08\u573A\u666F\u5408\u540C\u8981\u6C42\u81F3\u5C11 1 \u4E2A\uFF09"}),$("table",{className:"fp-intake-table",children:[z("thead",{children:$("tr",{children:[z("th",{children:"id"}),z("th",{children:"\u8F74\u5FC3 X"}),z("th",{children:"\u8F74\u5FC3 Y"}),z("th",{children:"\u534A\u5F84"}),z("th",{children:"Z \u4E0B\u9650"}),z("th",{children:"Z \u4E0A\u9650"}),z("th",{})]})}),z("tbody",{children:f.environment.cylinders.map((b,T)=>$("tr",{children:[z("td",{children:z("input",{value:b.id,disabled:t,"aria-label":`\u56FA\u5B9A\u67F1 ${T} id`,onChange:k=>{let V=k.target.value;M(re=>re.environment.cylinders[T].id=V)}})}),z("td",{children:E(b.x,k=>M(V=>V.environment.cylinders[T].x=k),`\u56FA\u5B9A\u67F1 ${T} X`)}),z("td",{children:E(b.y,k=>M(V=>V.environment.cylinders[T].y=k),`\u56FA\u5B9A\u67F1 ${T} Y`)}),z("td",{children:E(b.radius,k=>M(V=>V.environment.cylinders[T].radius=k),`\u56FA\u5B9A\u67F1 ${T} \u534A\u5F84`)}),z("td",{children:E(b.zMin,k=>M(V=>V.environment.cylinders[T].zMin=k),`\u56FA\u5B9A\u67F1 ${T} Z \u4E0B\u9650`)}),z("td",{children:E(b.zMax,k=>M(V=>V.environment.cylinders[T].zMax=k),`\u56FA\u5B9A\u67F1 ${T} Z \u4E0A\u9650`)}),z("td",{children:z("button",{type:"button",disabled:t,onClick:()=>M(k=>{k.environment.cylinders.splice(T,1)}),children:"\u5220\u9664"})})]},T))})]}),z("button",{type:"button",disabled:t,onClick:()=>M(b=>{b.environment.cylinders.push({id:"",x:"",y:"",radius:"",zMin:"",zMax:""})}),children:"\u6DFB\u52A0\u56FA\u5B9A\u67F1"}),z("h3",{children:"\u87BA\u9489\u5934\u5305\u7EDC\uFF08\u6BCF\u4E2A\u5E95\u5EA7\u5B54\u6070\u597D 1 \u4E2A\uFF09"}),$("table",{className:"fp-intake-table",children:[z("thead",{children:$("tr",{children:[z("th",{children:"\u5E95\u5EA7\u5B54 #"}),z("th",{children:"\u534A\u5F84"}),z("th",{children:"Z \u4E0B\u9650"}),z("th",{children:"Z \u4E0A\u9650"}),z("th",{})]})}),z("tbody",{children:f.environment.screwHeads.map((b,T)=>$("tr",{children:[z("td",{children:$("select",{value:b.holeIndex,disabled:t,"aria-label":`\u87BA\u9489\u5934 ${T} \u5E95\u5EA7\u5B54`,onChange:k=>{let V=k.target.value;M(re=>re.environment.screwHeads[T].holeIndex=V)},children:[z("option",{value:"",children:"\uFF08\u9009\u62E9\u5B54\uFF09"}),f.baseHoles.centers.map((k,V)=>$("option",{value:String(V),children:["#",V]},V))]})}),z("td",{children:E(b.radius,k=>M(V=>V.environment.screwHeads[T].radius=k),`\u87BA\u9489\u5934 ${T} \u534A\u5F84`)}),z("td",{children:E(b.zMin,k=>M(V=>V.environment.screwHeads[T].zMin=k),`\u87BA\u9489\u5934 ${T} Z \u4E0B\u9650`)}),z("td",{children:E(b.zMax,k=>M(V=>V.environment.screwHeads[T].zMax=k),`\u87BA\u9489\u5934 ${T} Z \u4E0A\u9650`)}),z("td",{children:z("button",{type:"button",disabled:t,onClick:()=>M(k=>{k.environment.screwHeads.splice(T,1)}),children:"\u5220\u9664"})})]},T))})]}),z("button",{type:"button",disabled:t,onClick:()=>M(b=>{let T=new Set(b.environment.screwHeads.map(k=>k.holeIndex));b.baseHoles.centers.forEach((k,V)=>{T.has(String(V))||b.environment.screwHeads.push({holeIndex:String(V),radius:"",zMin:"",zMax:""})})}),children:"\u6309\u5E95\u5EA7\u5B54\u8865\u9F50\u4E00\u884C"}),z("h3",{children:"\u8FDE\u63A5\u5668\u7A7A\u95F4"}),z("div",{className:"fp-intake-rows",children:[["","\u672A\u586B\u5199\uFF08\u7531\u7A0B\u5E8F\u8FFD\u95EE\uFF09"],["box","\u7ED9\u51FA\u4E00\u4E2A\u76D2\u8303\u56F4"],["not_covered","\u660E\u786E\u672A\u8986\u76D6\uFF08\u4E0D\u5047\u88C5\u5DF2\u9A8C\uFF09"]].map(([b,T])=>$("label",{className:"fp-toggle",children:[z("input",{type:"radio",name:"fp-intake-connector",checked:f.environment.connectorMode===b,disabled:t,onChange:()=>M(k=>{k.environment.connectorMode=b})}),T]},b||"empty"))}),f.environment.connectorMode==="box"?$("div",{className:"fp-intake-rows",children:[$("span",{className:"fp-intake-range",children:["\u5C40\u90E8 X \u2208 ",E(f.environment.connector.xMin,b=>M(T=>T.environment.connector.xMin=b),"\u8FDE\u63A5\u5668 X \u4E0B\u9650")," \u2026",E(f.environment.connector.xMax,b=>M(T=>T.environment.connector.xMax=b),"\u8FDE\u63A5\u5668 X \u4E0A\u9650")]}),$("span",{className:"fp-intake-range",children:["\u5C40\u90E8 Y \u2208 ",E(f.environment.connector.yMin,b=>M(T=>T.environment.connector.yMin=b),"\u8FDE\u63A5\u5668 Y \u4E0B\u9650")," \u2026",E(f.environment.connector.yMax,b=>M(T=>T.environment.connector.yMax=b),"\u8FDE\u63A5\u5668 Y \u4E0A\u9650")]}),$("span",{className:"fp-intake-range",children:["\u7EDD\u5BF9 Z \u2208 ",E(f.environment.connector.zMin,b=>M(T=>T.environment.connector.zMin=b),"\u8FDE\u63A5\u5668 Z \u4E0B\u9650")," \u2026",E(f.environment.connector.zMax,b=>M(T=>T.environment.connector.zMax=b),"\u8FDE\u63A5\u5668 Z \u4E0A\u9650")]})]}):null,$("label",{className:"fp-toggle",children:[z("input",{type:"checkbox",checked:f.environment.support,disabled:t,onChange:b=>{let T=b.target.checked;M(k=>k.environment.support=T)}}),"\u58F0\u660E\u76F4\u63A5\u652F\u6491\uFF1A\u8BBE\u5907\u5E95\u9762 \u2194 \u677F\u9876\u9762\uFF08P0 \u652F\u6491\u6A21\u578B\uFF09"]})]}),$("fieldset",{className:"fp-intake-fieldset","data-form-step":"2",children:[z("legend",{children:"\u9A8C\u6536\u8981\u6C42\uFF08\u56DB\u9879 + \u6765\u6E90\uFF09"}),z("p",{className:"fp-field-help",children:"\u81EA\u7531\u95F4\u9699\u662F\u8BBE\u5907\u4E0E\u969C\u788D\u4E4B\u95F4\u7684\u7A7A\u9699\uFF1B\u5B54\u8FB9\u6750\u6599\u662F\u5B54\u5230\u677F\u8FB9\u7684\u5269\u4F59\u5BBD\u5EA6\uFF1B\u5B54\u95F4\u6750\u6599\u662F\u5B54\u4E0E\u5B54\u4E4B\u95F4\u7684\u5269\u4F59\u5BBD\u5EA6\u3002"}),z("div",{className:"fp-intake-rows",children:$("label",{children:["\u8981\u6C42\u6765\u6E90",$("select",{value:f.requirements.source,disabled:t,"data-fitplate":"intake-req-source",onChange:b=>{let T=b.target.value;M(k=>k.requirements.source=T)},children:[z("option",{value:"",children:"\uFF08\u8BF7\u9009\u62E9\uFF09"}),Bs.map(b=>z("option",{value:b,children:Ii[b]},b))]})]})}),$("div",{className:"fp-intake-rows",children:[$("label",{children:["\u6700\u5C0F\u81EA\u7531\u95F4\u9699 ",E(f.requirements.clearance,b=>M(T=>T.requirements.clearance=b),"\u6700\u5C0F\u81EA\u7531\u95F4\u9699")]}),$("label",{children:["\u6700\u5C0F\u8FB9\u7F18\u4F59\u91CF ",E(f.requirements.edge,b=>M(T=>T.requirements.edge=b),"\u6700\u5C0F\u8FB9\u7F18\u4F59\u91CF")]}),$("label",{children:["\u6700\u5C0F\u5B54\u95F4\u6750\u6599 ",E(f.requirements.hole,b=>M(T=>T.requirements.hole=b),"\u6700\u5C0F\u5B54\u95F4\u6750\u6599")]}),$("label",{children:["\u5C3A\u5BF8\u516C\u5DEE ",E(f.requirements.tolerance,b=>M(T=>T.requirements.tolerance=b),"\u5C3A\u5BF8\u516C\u5DEE")]})]})]}),I>=0&&!R?$("div",{className:"fp-intake-actions",children:[z("button",{type:"button",disabled:v||t,"data-fitplate":"input-back",onClick:()=>O(I-1),children:I===0?"\u8FD4\u56DE\u9009\u62E9":"\u4E0A\u4E00\u6B65"}),I<3?$("button",{type:"button",className:"fp-intake-primary","data-fitplate":"input-next",disabled:v||t,onClick:()=>O(I+1),children:["\u4E0B\u4E00\u6B65\uFF1A",D[I+1]]}):null,z("button",{type:"button",className:"fp-intake-primary","data-fitplate":"intake-submit",hidden:I!==3,disabled:t||v||!o.validation.ok&&!o.validation.canSubmitForClarification,onClick:()=>{n.submitRequest()},children:o.phase==="sending"?"\u53D1\u9001\u4E2D\u2026":"\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42"}),z("button",{type:"button","data-fitplate":"intake-refresh",disabled:t||o.busy,onClick:()=>{n.refresh()},children:"\u5237\u65B0\u72B6\u6001"}),z("span",{className:"fp-muted","data-fitplate":"intake-validation",hidden:I!==3,children:o.validation.ok?"\u8868\u5355\u6821\u9A8C\u901A\u8FC7\uFF08\u53D1\u9001\u540E\u4ECD\u7531\u7A0B\u5E8F\u590D\u6838\uFF09":o.validation.canSubmitForClarification?`\u7F3A\u5C11 ${o.validation.issues.length} \u9879\u6570\u503C\uFF0C\u53EF\u5148\u70B9\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u5E76\u6309\u7A0B\u5E8F\u8FFD\u95EE\u8865\u5145\uFF1B\u8865\u9F50\u524D\u4E0D\u80FD\u786E\u8BA4`:`\u8FD8\u6709 ${o.validation.issues.length} \u9879\u5F85\u4FEE\u6B63`})]}):null,I===3&&!o.validation.ok?$("details",{className:"fp-intake-issues","data-fitplate":"intake-issues",open:!0,children:[z("summary",{children:"\u67E5\u770B\u5F85\u4FEE\u6B63\u9879"}),z("ul",{children:o.validation.issues.slice(0,20).map((b,T)=>$("li",{children:[z("code",{children:b.path}),"\uFF1A",b.message]},T))})]}):null]})}function Tf({form:n,onEdit:e}){let t=zs.find(i=>i.id===n.deviceCardId);return $("div",{className:"fp-input-review","data-fitplate":"input-review",children:[z("p",{className:"fp-review-request",children:n.text||"\u5C1A\u672A\u586B\u5199\u5B89\u88C5\u8981\u6C42"}),$("div",{className:"fp-review-cards",children:[$("section",{children:[$("h3",{children:["\u5B89\u88C5\u5BF9\u8C61 ",z("button",{type:"button",onClick:()=>e(0),children:"\u4FEE\u6539"})]}),z("p",{children:t?.name||"\u8BBE\u5907\u672A\u9009\u62E9"}),$("strong",{children:["\u677F ",n.plate.width||"\u5F85\u586B"," \xD7 ",n.plate.height||"\u5F85\u586B"," \xD7 ",n.plate.thickness||"\u5F85\u586B"," ",n.unit]}),$("p",{children:["\u5BBD",n.plate.widthEditable?"\u5141\u8BB8\u8C03\u6574":"\u56FA\u5B9A"," \xB7 \u9AD8",n.plate.heightEditable?"\u5141\u8BB8\u8C03\u6574":"\u56FA\u5B9A"," \xB7 \u539A\u5EA6\u56FA\u5B9A"]})]}),$("section",{children:[$("h3",{children:["AI \u53EF\u4EE5\u8C03\u6574\u4EC0\u4E48 ",z("button",{type:"button",onClick:()=>e(1),children:"\u4FEE\u6539"})]}),z("p",{children:ml(n)}),$("p",{children:["\u5E95\u5EA7\u5B54 ",n.baseHoles.centers.length," \u4E2A\uFF0C\u5B54\u5F84 ",n.baseHoles.diameter||"\u5F85\u586B"," ",n.unit,"\uFF0C\u5B54\u4F4D\u4FDD\u6301\u4E0D\u53D8\u3002"]})]}),$("section",{children:[$("h3",{children:["\u5468\u56F4\u73AF\u5883\u4E0E\u68C0\u67E5 ",z("button",{type:"button",onClick:()=>e(2),children:"\u4FEE\u6539"})]}),$("p",{children:[n.environment.cylinders.length," \u4E2A\u56FA\u5B9A\u67F1 \xB7 ",n.environment.screwHeads.length," \u4E2A\u87BA\u9489\u5934\u5305\u7EDC"]}),$("p",{children:["\u6700\u5C0F\u81EA\u7531\u95F4\u9699 ",n.requirements.clearance||"\u5F85\u586B"," ",n.unit," \xB7 \u5B54\u8FB9\u6750\u6599 ",n.requirements.edge||"\u5F85\u586B"," ",n.unit]}),$("p",{children:["\u73AF\u5883\u6765\u6E90\uFF1A",n.environment.source?Ii[n.environment.source]:"\u672A\u586B\u5199","\uFF1B\u8981\u6C42\u6765\u6E90\uFF1A",n.requirements.source?Ii[n.requirements.source]:"\u672A\u586B\u5199"]})]})]}),z("p",{className:"fp-field-help",children:"\u8BBE\u5907\u5361\u6765\u81EA\u5382\u5546\u89C4\u683C\uFF1B\u793A\u4F8B\u7684\u5468\u56F4\u73AF\u5883\u548C\u68C0\u67E5\u8981\u6C42\u4E3A\u8BBE\u8BA1\u5047\u8BBE\u3002\u5F53\u524D\u4EC5\u68C0\u67E5\u8F6F\u4EF6\u51E0\u4F55\uFF0C\u5C1A\u672A\u9A8C\u8BC1\u5B9E\u7269\u88C5\u914D\u3002"})]})}function Au({status:n}){let e=n.kind==="error"?"alert":"status";return $("p",{className:`fp-alert ${n.kind==="error"?"fp-alert-error":n.kind==="warn"?"fp-alert-warn":"fp-alert-info"}`,role:e,"data-fitplate":"intake-status",children:[n.title,n.detail?$("span",{className:"fp-detail",children:["\uFF08",n.detail,"\uFF09"]}):null]})}function wf({cardId:n}){let e=zs.find(t=>t.id===n);return e?$("div",{className:"fp-intake-device","data-fitplate":"intake-device-card",children:[$("p",{className:"fp-muted",children:["\u767B\u8BB0\u8BBE\u5907\u5361\uFF1A",e.name,"\uFF08\u5F53\u524D\u4EC5\u6B64 1 \u5F20\uFF0C\u4E0D\u4F1A\u865A\u6784\u5176\u4ED6\u5361\u7247\uFF09\u3002\u5916\u58F3\u5305\u7EDC ",e.bodySizeMm.join("\xD7")," mm \xB7 \u5B54\u8DDD"," ",e.holePitchMm," mm \xB7 ",e.threadInterface]}),$("p",{className:"fp-muted",children:["\u677F\u4FA7\u901A\u5B54\u8BBE\u8BA1\u9009\u62E9 \u2300",e.designHoleDiameterMm," mm\uFF08\u672C\u9879\u76EE\u8BBE\u8BA1\u503C\uFF0C\u975E\u539F\u5382\u5C3A\u5BF8\uFF09\uFF1B\u8BBE\u5907\u6765\u6E90\u7EA7\u522B\uFF1A",e.sourceLevel,"\u3002"]}),z("p",{className:"fp-warn",children:e.note})]}):null}var Vs=n=>Array.isArray(n)?n:[],Gn=n=>n&&typeof n=="object"&&!Array.isArray(n)?n:null;function Af(n){let e=n.draft??{},t=Vs(e.missing_fields).flatMap(c=>{let u=Gn(c);return u&&typeof u.path=="string"&&typeof u.question=="string"?[{path:u.path,question:u.question}]:[]}),i=Vs(e.conflicts).flatMap(c=>{let u=Gn(c);if(!u||typeof u.path!="string")return[];let d=h=>{let p=Gn(h);if(!p)return String(h??"");let m=typeof p.kind=="string"?p.kind:"",y=typeof p.ref=="string"?p.ref:"",g=p.value!==void 0?`=${JSON.stringify(p.value)}`:"";return`${m}${y?`:${y}`:""}${g}`};return[{path:u.path,formText:d(u.form),textText:d(u.text)}]}),s=Vs(e.unsupported_features).flatMap(c=>{let u=Gn(c);return u&&typeof u.feature=="string"?[{feature:u.feature,ref:typeof u.ref=="string"?u.ref:""}]:[]}),r=Vs(e.field_proposals).flatMap(c=>{let u=Gn(c);if(!u||typeof u.field_path!="string")return[];let d=Gn(u.source);return[{fieldPath:u.field_path,disposition:typeof u.disposition=="string"?u.disposition:"",valueMm:typeof u.value_mm=="number"?u.value_mm:null,unitIn:typeof u.unit_in=="string"?u.unit_in:null,sourceKind:d&&typeof d.kind=="string"?d.kind:"",sourceRef:d&&typeof d.ref=="string"?d.ref:"",reason:typeof u.reason=="string"?u.reason:null}]}),a=Vs(e.text_interpretations).flatMap(c=>{let u=Gn(c);if(!u||typeof u.field_path!="string")return[];let d=Gn(u.quote),h=d&&typeof d.literal=="string"?d.literal:"";return h?[{fieldPath:u.field_path,kind:typeof u.kind=="string"?u.kind:"",quote:h,start:d&&Number.isInteger(d.start)?d.start:null,end:d&&Number.isInteger(d.end)?d.end:null,valueMm:typeof u.value_mm=="number"?u.value_mm:null,unitIn:typeof u.unit_in=="string"?u.unit_in:null,sourceRef:typeof u.source_ref=="string"?u.source_ref:""}]:[]}),o=Gn(e.program),l=o&&typeof o.id=="string"?`${o.id} ${String(o.version??"")}`:"";return{questions:t,conflicts:i,unsupported:s,proposals:r,interpretations:a,program:l}}function Rf({card:n,snapshot:e,onConfirm:t}){let{questions:i,conflicts:s,unsupported:r,proposals:a,interpretations:o,program:l}=Af(n),c=e.form,u=c.unit,d=u==="mm"?"1":u==="in"?"25.4":u==="cm"?"10":u==="m"?"1000":"0.001",h=n.outcome==="READY_TO_CONFIRM",p=e.cardExpired;return $("div",{className:`fp-intake-card ${p?"fp-intake-card-expired":""}`,"data-fitplate":"intake-card","data-outcome":n.outcome,children:[$("div",{className:"fp-intake-card-head",children:[z("span",{className:`fp-badge ${Mf[n.outcome]??"fp-outcome-unknown"}`,children:gl[n.outcome]??n.outcome}),$("span",{className:"fp-muted",children:["\u9700\u6C42\u7248\u672C ",n.requestRevision,p?"\uFF08\u5DF2\u8FC7\u671F\uFF1A\u8F93\u5165\u5DF2\u4FEE\u6539\uFF09":""]})]}),p?z("p",{className:"fp-alert fp-alert-warn",children:"\u8F93\u5165\u5DF2\u4FEE\u6539\uFF0C\u8FD9\u5F20\u5361\u4E0D\u518D\u53EF\u7528\u4E8E\u786E\u8BA4\uFF1B\u8BF7\u91CD\u65B0\u70B9\u51FB\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u3002"}):null,z("div",{className:"fp-intake-summary",children:$("dl",{className:"fp-facts",children:[z("dt",{children:"\u9501\u5B9A\u5C3A\u5BF8"}),$("dd",{children:[c.plate.width," \xD7 ",c.plate.height," \xD7 ",c.plate.thickness," ",u,c.plate.widthEditable?`\uFF08\u5BBD\u53EF\u5728 [${c.plate.widthMin}, ${c.plate.widthMax}] ${u} \u5185\u8C03\u6574\uFF09`:"\uFF08\u5BBD\u9AD8\u9501\u5B9A\uFF09",c.plate.heightEditable?`\uFF08\u9AD8\u53EF\u5728 [${c.plate.heightMin}, ${c.plate.heightMax}] ${u} \u5185\u8C03\u6574\uFF09`:""]}),z("dt",{children:"\u5E95\u5EA7\u5B54"}),$("dd",{children:["\u2300",c.baseHoles.diameter," ",u," \xD7 ",c.baseHoles.centers.length," \u4E2A\uFF08\u51BB\u7ED3\u4E0D\u52A8\uFF09"]}),z("dt",{children:"\u8BBE\u5907\u5B89\u88C5"}),$("dd",{children:["\u901A\u5B54 \u2300",c.mounting.holeDiameter," ",u," \xB7 \u65CB\u8F6C 0\xB0",n.deviceCard?` \xB7 \u8BBE\u5907\u5361 ${n.deviceCard.id}`:""]}),z("dt",{children:"\u5141\u8BB8\u79FB\u52A8\u8303\u56F4"}),z("dd",{children:ml(c)}),z("dt",{children:"\u5355\u4F4D\u6362\u7B97"}),$("dd",{children:["\u53D1\u9001\u5355\u4F4D ",u,"\uFF1B\u56FA\u5B9A\u6362\u7B97 1 ",u," = ",d," mm\uFF0C\u7A0B\u5E8F\u8349\u7A3F\u6309 mm \u7F16\u8BD1\uFF08\u4E0B\u65B9 value_mm \u5373\u6362\u7B97\u7ED3\u679C\uFF09"]}),z("dt",{children:"\u9A8C\u6536\u8981\u6C42"}),$("dd",{children:["\u95F4\u9699 \u2265 ",c.requirements.clearance," \xB7 \u8FB9\u8DDD \u2265 ",c.requirements.edge," \xB7 \u5B54\u8FB9 \u2265 ",c.requirements.hole," \xB7 \u516C\u5DEE \xB1",c.requirements.tolerance," ",u,"\uFF08\u6765\u6E90\uFF1A",c.requirements.source?Ii[c.requirements.source]:"\u672A\u586B","\uFF09 \xB7 \u6362\u7B97 mm\uFF1A",[c.requirements.clearance,c.requirements.edge,c.requirements.hole,c.requirements.tolerance].map(m=>yl(ai(Number(m)||0,u))).join(" / ")]}),z("dt",{children:"\u73AF\u5883"}),$("dd",{children:[c.environment.source?Ii[c.environment.source]:"\u672A\u586B"," \xB7 \u56FA\u5B9A\u67F1 ",c.environment.cylinders.length," \xB7 \u87BA\u9489\u5934"," ",c.environment.screwHeads.length," \xB7 \u8FDE\u63A5\u5668\u7A7A\u95F4"," ",c.environment.connectorMode==="not_covered"?"\u660E\u786E\u672A\u8986\u76D6":c.environment.connectorMode==="box"?"\u76D2\u8303\u56F4":"\u672A\u586B\u5199"]})]})}),i.length>0?$("div",{className:"fp-intake-block",children:[$("h3",{children:["\u7A0B\u5E8F\u5F85\u6F84\u6E05\uFF08",i.length,"\uFF09"]}),z("ul",{children:i.map((m,y)=>$("li",{children:[z("code",{children:m.path}),"\uFF1A",m.question]},y))})]}):null,s.length>0?$("div",{className:"fp-intake-block fp-warn",children:[$("h3",{children:["\u7A0B\u5E8F\u53D1\u73B0\u51B2\u7A81\uFF08",s.length,"\uFF09"]}),z("ul",{children:s.map((m,y)=>$("li",{children:[z("code",{children:m.path}),"\uFF1A\u8868\u5355 ",m.formText," \u2194 \u6587\u672C ",m.textText]},y))})]}):null,r.length>0?$("div",{className:"fp-intake-block fp-warn",children:[$("h3",{children:["\u8D85\u51FA\u73B0\u6709\u652F\u6301\u8303\u56F4\uFF08",r.length,"\uFF09"]}),z("ul",{children:r.map((m,y)=>$("li",{children:[m.feature,"\uFF08",m.ref,"\uFF09"]},y))})]}):null,i.length===0&&s.length===0&&r.length===0?$("p",{className:"fp-muted",children:["\u7A0B\u5E8F\u672A\u7ED9\u51FA\u5F85\u6F84\u6E05/\u51B2\u7A81/\u8D85\u8303\u56F4\u9879\uFF1B\u8349\u7A3F\u72B6\u6001\uFF1A",gl[n.outcome]??n.outcome,"\u3002"]}):null,o.length>0?$("div",{className:"fp-intake-block fp-intake-interpretations","data-fitplate":"intake-interpretations",children:[$("h3",{children:["\u7A0B\u5E8F\u5DF2\u6838\u9A8C\u7684\u539F\u6587\u7EA6\u675F\uFF08",o.length,"\uFF09"]}),$("p",{className:"fp-muted",children:["\u4E0B\u5217\u6761\u76EE\u662F\u6A21\u578B\u4ECE\u771F\u5B9E\u9644\u4EF6\u539F\u6587\u4E2D\u5F15\u7528\u7684\u6587\u672C\u7247\u6BB5\uFF0C\u7A0B\u5E8F\u5DF2\u91CD\u65B0\u6838\u5BF9\u539F\u6587\u5E76\u590D\u7B97\u6BEB\u7C73\u503C\u3002\u5B83\u4EEC\u662F",z("strong",{children:"\u7EA6\u675F"}),"\uFF0C\u4E0D\u662F\u65B0\u7684\u540D\u4E49\u5C3A\u5BF8\uFF1A \u4F8B\u5982\u677F\u5BBD\u9501\u5B9A 80 \u4E14\u539F\u6587\u7ED9\u51FA\u4E0A\u9650 90 \u65F6\uFF0C\u4ECD\u4EE5\u9501\u5B9A\u7684 80 \u4E3A\u51C6\uFF0C\u4E0A\u9650\u53EA\u662F\u201C\u4E0D\u5F97\u8D85\u8FC7\u201D\u3002\u6765\u6E90\u5747\u4E3A\u8F6F\u4EF6\u51E0\u4F55\uFF0C\u672A\u505A\u5B9E\u7269\u9A8C\u8BC1\u3002"]}),z("ul",{children:o.map((m,y)=>$("li",{"data-fitplate":"intake-interpretation",children:[$("div",{children:[z("code",{children:m.fieldPath}),$("span",{className:"fp-muted",children:[" \xB7 ",m.kind==="upper_bound"?"\u4E0A\u9650\uFF08\u4E0D\u5F97\u8D85\u8FC7\uFF09":m.kind||"\u672A\u6807\u6CE8"]})]}),$("blockquote",{className:"fp-intake-quote",children:["\u539F\u6587\uFF1A",m.quote,m.start!==null&&m.end!==null?`\uFF08\u5B57\u7B26\u504F\u79FB ${m.start}\u2013${m.end}\uFF09`:""]}),$("div",{className:"fp-muted",children:["\u7A0B\u5E8F\u590D\u7B97\uFF1A\u2264 ",m.valueMm===null?"\u2014":yl(m.valueMm)," mm",m.unitIn?`\uFF08\u539F\u6587\u5355\u4F4D ${m.unitIn}\uFF09`:"",m.sourceRef?` \xB7 \u6765\u6E90 ${m.sourceRef}`:""]})]},y))})]}):null,a.length>0?$("details",{className:"fp-intake-block",children:[$("summary",{children:["\u7A0B\u5E8F\u5B57\u6BB5\u63D0\u8BAE\uFF08",a.length,"\uFF0C\u53EA\u8BFB\uFF09"]}),$("table",{className:"fp-intake-table",children:[z("thead",{children:$("tr",{children:[z("th",{children:"\u5B57\u6BB5"}),z("th",{children:"\u5904\u7F6E"}),z("th",{children:"value_mm"}),z("th",{children:"\u8F93\u5165\u5355\u4F4D"}),z("th",{children:"\u6765\u6E90"})]})}),z("tbody",{children:a.slice(0,40).map((m,y)=>$("tr",{children:[$("td",{children:[z("code",{children:m.fieldPath}),m.valueMm===null&&m.reason?z("div",{className:"fp-muted fp-intake-proposal-reason","data-fitplate":"intake-proposal-reason",children:m.reason}):null]}),z("td",{children:m.disposition}),z("td",{children:m.valueMm===null?"\u2014":yl(m.valueMm)}),z("td",{children:m.unitIn??"\u2014"}),$("td",{children:[m.sourceKind,m.sourceRef?`:${m.sourceRef}`:""]})]},y))})]})]}):null,$("div",{className:"fp-intake-confirm",children:[z("button",{type:"button",className:"fp-intake-primary","data-fitplate":"intake-confirm",disabled:e.busy||!e.confirmable||p,onClick:t,children:e.phase==="confirming"?"\u6838\u5BF9\u4E2D\u2026":"\u786E\u8BA4\u6761\u4EF6\uFF0C\u5F00\u59CB\u8BBE\u8BA1"}),z("p",{className:"fp-muted",children:h?"\u201C\u8F93\u5165\u5B8C\u6574\u4E00\u81F4\u201D\u53EA\u8868\u793A\u53EF\u4EE5\u6838\u5BF9\u786E\u8BA4\uFF0C\u4E0D\u8868\u793A\u6709\u89E3\u6216\u5DF2\u901A\u8FC7\u9A8C\u8BC1\u3002":"\u5F53\u524D\u8349\u7A3F\u8FD8\u4E0D\u80FD\u786E\u8BA4\uFF1A\u8BF7\u5148\u6309\u4E0A\u9762\u7684\u95EE\u9898\u4FEE\u6539\u8F93\u5165\uFF0C\u518D\u91CD\u65B0\u70B9\u201C\u8BA9 AI \u68C0\u67E5\u8FD9\u4E9B\u8981\u6C42\u201D\u3002"}),z("p",{className:"fp-muted",children:"\u786E\u8BA4\u540E\uFF0CAI \u4F1A\u5EFA\u6A21\u5E76\u68C0\u67E5\u3002\u82E5\u4E0A\u65B9\u51FA\u73B0\u6743\u9650\u5361\uFF0C\u8BF7\u6838\u5BF9\u5DE5\u5177\u540E\u70B9 Allow once\uFF08\u5141\u8BB8\u4E00\u6B21\uFF09\u3002\u7ED3\u679C\u4F1A\u663E\u793A\u5728\u672C\u9762\u677F\u3002"})]}),e.confirmation||e.frozen?$("div",{className:"fp-intake-block",children:[z("h3",{children:"\u51BB\u7ED3\u72B6\u6001"}),z("p",{className:"fp-muted",children:e.frozen?`\u7A0B\u5E8F\u5DF2\u767B\u8BB0\u51BB\u7ED3\uFF1A\u4EFB\u52A1\u4FEE\u8BA2 ${e.frozen.revision??"\u672A\u77E5"}\uFF08\u4E0A\u4E00\u7248\u672C\u7684\u7ED3\u679C\u4E0D\u4EE3\u8868\u672C\u7248\u672C\uFF1B\u4EFB\u52A1\u8EAB\u4EFD\u89C1\u8BCA\u65AD\u533A\uFF09`:"\u786E\u8BA4\u5DF2\u53D1\u51FA\uFF0C\u7B49\u5F85\u7A0B\u5E8F\u767B\u8BB0\u51BB\u7ED3\u7ED3\u679C\u2026"})]}):null,$("details",{className:"fp-intake-block fp-intake-diagnostics","data-fitplate":"intake-diagnostics",children:[z("summary",{children:"\u8BCA\u65AD\u4FE1\u606F\uFF08\u5F15\u7528\u4E0E\u54C8\u5E0C\uFF09"}),$("ul",{className:"fp-muted",children:[$("li",{children:["request_id\uFF1A",n.requestId]}),$("li",{children:["\u8BF7\u6C42\u9644\u4EF6\u5F15\u7528\uFF1A",n.attachmentRef]}),$("li",{children:["\u8BF7\u6C42\u9644\u4EF6\u5B57\u8282 SHA-256\uFF1A",n.attachmentSha256]}),$("li",{children:["\u8349\u7A3F draft_hash\uFF1A",n.draftHash]}),e.confirmation?$("li",{children:["\u786E\u8BA4\u9644\u4EF6\u5B57\u8282 SHA-256\uFF1A",e.confirmation.sha256]}):null,e.frozen?$("li",{children:["\u4EFB\u52A1\u8EAB\u4EFD\uFF1A",e.frozen.taskId??"\u672A\u77E5"," \xB7 \u4FEE\u8BA2 ",e.frozen.revision??"\u672A\u77E5"]}):null,n.stagedAt?$("li",{children:["\u767B\u8BB0\u65F6\u95F4\uFF1A",n.stagedAt]}):null,l?$("li",{children:["\u7F16\u8BD1\u5668\uFF1A",l]}):null,n.notes?$("li",{children:["\u670D\u52A1\u8BF4\u660E\uFF1A",n.notes]}):null]})]})]})}var Hs=n=>n!==null&&typeof n=="object"&&!Array.isArray(n),Sl=n=>typeof n=="number"&&Number.isFinite(n)?n:null,oi=n=>typeof n=="string"&&n.length>0&&n.length<=128?n:null,Cf=n=>typeof n=="string"&&/^[a-f0-9]{64}$/i.test(n)?n.toLowerCase():null,Ru=n=>n===null?"\u672A\u63D0\u4F9B":String(Math.round(n*1e6)/1e6);function If(n){let e=Hs(n?.measured)?n.measured:{},t=Hs(n?.required)?n.required:{},i=Hs(e.minimum_free_clearance_pair)?e.minimum_free_clearance_pair:{},s=oi(i.moving),r=oi(i.fixed);return{measuredMm:Sl(e.minimum_free_clearance_mm),measurementState:Sl(e.minimum_free_clearance_mm)!==null?"measured":e.minimum_free_clearance_mm===null&&e.minimum_free_clearance_pair===null?"none-reported":"unavailable",requiredMm:Sl(t.minimum_free_clearance_mm),pair:s&&r?{moving:s,fixed:r}:null,supportContactStatus:oi(e.support_contact_status),checkScope:Array.isArray(n?.objects)?n.objects.filter(a=>oi(a)!==null):[],failurePair:oi(e.worst_pair)}}function Cu(n){let e=n.pair?`${n.pair.moving} \u2194 ${n.pair.fixed}`:"\u5BF9\u8C61\u5BF9\u672A\u63D0\u4F9B",i=[`${n.measuredMm!==null?`\u5B9E\u6D4B\u6700\u5C0F\u81EA\u7531\u95F4\u9699 ${Ru(n.measuredMm)} mm\uFF0C\u5B9E\u6D4B\u6700\u5C0F\u81EA\u7531\u95F4\u9699\u5BF9\u8C61\u5BF9 ${e}`:n.measurementState==="none-reported"?"\u62A5\u544A\u672A\u6D4B\u5F97\u81EA\u7531\u5BF9\u8C61\u5BF9\uFF08\u6700\u5C0F\u81EA\u7531\u95F4\u9699\u4E3A null\uFF09\uFF1B\u4E0D\u4EE5\u5141\u8BB8\u652F\u6491\u63A5\u89E6\u7684 0 mm \u4EE3\u66FF":"\u5B9E\u6D4B\u6700\u5C0F\u81EA\u7531\u95F4\u9699\u672A\u63D0\u4F9B\uFF08\u4E0D\u4EE5\u5141\u8BB8\u652F\u6491\u63A5\u89E6\u7684 0 mm \u4EE3\u66FF\uFF09"}\uFF1B\u8981\u6C42 ${n.requiredMm===null?"\u672A\u63D0\u4F9B":`\u2265 ${Ru(n.requiredMm)} mm`}`];return n.supportContactStatus&&i.push(`\u652F\u6491\u63A5\u89E6\uFF1A${n.supportContactStatus}\uFF08\u4E0E\u81EA\u7531\u95F4\u9699\u5206\u5F00\u5224\u65AD\uFF09`),n.failurePair&&i.push(`\u5931\u8D25/\u6700\u5DEE\u5BF9\u8C61\u5BF9\uFF1A${n.failurePair}\uFF08\u4E0D\u4EE3\u66FF\u5B9E\u6D4B\u6700\u5C0F\u81EA\u7531\u95F4\u9699\u5BF9\u8C61\u5BF9\uFF09`),i}function Gs(n,e){let t=Hs(n)?n:{},i=Hs(e)?e:{},s={candidateId:oi(t.candidate_id),taskRevision:Number.isInteger(t.task_revision)&&t.task_revision>0?t.task_revision:null,stepSha256:Cf(t.hashes?.step_sha256),reportId:oi(t.report_id)},r=["candidateId","taskRevision","stepSha256","reportId"],a=r.filter(h=>s[h]===null||i[h]===null||i[h]===void 0),o=r.filter(h=>s[h]!==null&&i[h]!=null&&s[h]!==i[h]),l=o.length?"stale":a.length?"unverified":"current",c=Array.isArray(t.checks)?t.checks:[],u=c.length===8&&["G01","G02","G03","G04","G05","G06","G07","G08"].every(h=>c.filter(p=>p?.id===h).length===1),d=c.find(h=>h?.id==="G06");return{identity:s,bindingState:l,missing:a,mismatched:o,overall:oi(t.overall)??"UNKNOWN",checksComplete:u,accepted:l==="current"&&u&&t.overall==="PASS"&&c.every(h=>h.status==="PASS")&&(!Array.isArray(t.errors)||t.errors.length===0),clearance:If(d),scope:"software_geometry_only"}}import{jsx as _n,jsxs as Qt}from"react/jsx-runtime";function Iu({run:n,version:e,report:t,freshness:i,change:s,busy:r,onDownload:a}){let o=Gs(t?.raw,{candidateId:e.candidateId,taskRevision:n.taskRevision,stepSha256:e.stepSha256,reportId:e.report?.reportId??null}),l=i?.state==="current"&&o.bindingState==="current",c=l&&o.accepted,u=n.exports.filter(C=>C.candidateId===e.candidateId&&C.reportId===o.identity.reportId&&!C.failed&&C.exportDir!==null),d=c&&e.reportFileSha256!==null&&e.reportSha256!==null&&u.some(C=>C.stepSha256===e.stepSha256&&C.reportFileSha256===e.reportFileSha256&&C.reportSha256===e.reportSha256),h=l?c?d?"exported":"validated":"failed":"unverified",p=l?c?d?"\u68C0\u67E5\u901A\u8FC7\uFF0C\u5F53\u524D\u7248\u672C\u5DF2\u5BFC\u51FA":u.length?"\u51E0\u4F55\u68C0\u67E5\u901A\u8FC7\uFF0C\u4EA4\u4ED8\u5305\u7ED1\u5B9A\u5F85\u6838\u5B9E":"\u51E0\u4F55\u68C0\u67E5\u901A\u8FC7\uFF0C\u5F85\u5BFC\u51FA\u4EA4\u4ED8\u5305":"\u51E0\u4F55\u9A8C\u6536\u5C1A\u672A\u901A\u8FC7":"\u62A5\u544A\u5F85\u6838\u5B9E",m=e.artifacts.filter(C=>["model.step","report.json","model.stl"].includes(C.artifactId)),y=C=>({sensor_body:"\u8BBE\u5907\u5916\u58F3",connector_access:"\u63A5\u7EBF\u9884\u7559\u7A7A\u95F4",plate:"\u5B89\u88C5\u677F",plate_top:"\u677F\u9762"})[C]??(/^post/.test(C)?`\u56FA\u5B9A\u67F1 ${C}`:C),g=o.clearance,f=l?t?.checks.filter(C=>C.status!=="PASS")??[]:[],M={G01:"\u5B9E\u4F53\u6709\u6548\u6027",G02:"\u677F\u5C3A\u5BF8",G03:"\u5E95\u5EA7\u5B54",G04:"\u8BBE\u5907\u5B89\u88C5\u5B54",G05:"\u5B54\u8FB9\u4E0E\u5B54\u95F4\u6750\u6599",G06:"\u88C5\u914D\u7A7A\u95F4",G07:"\u56FA\u5B9A\u6761\u4EF6",G08:"\u5BFC\u51FA\u4E00\u81F4\u6027"};return Qt("section",{className:`fp-delivery-card fp-delivery-${h}`,"data-fitplate":"delivery-card","data-delivery-state":h,children:[Qt("div",{className:"fp-delivery-main",children:[_n("h2",{children:p}),s?_n("p",{children:s}):null,_n("p",{className:"fp-result-next",children:l?c?d?"\u4E0B\u8F7D STEP \u7EE7\u7EED\u7F16\u8F91\uFF0CSTL \u7528\u4E8E\u5207\u7247\u9884\u89C8\uFF1B\u62A5\u544A\u53EF\u6838\u5BF9\u68C0\u67E5\u7ED3\u679C\u3002":"\u51E0\u4F55\u5DF2\u901A\u8FC7\uFF0C\u4EA4\u4ED8\u5305\u4ECD\u5F85\u5BFC\u51FA\u6216\u6838\u5B9E\uFF1B\u53EF\u5148\u67E5\u770B\u5F53\u524D\u6A21\u578B\u4E0E\u62A5\u544A\u3002":"\u8FD9\u4E2A\u65B9\u6848\u8FD8\u4E0D\u80FD\u4F5C\u4E3A\u5408\u683C\u7ED3\u679C\u3002\u67E5\u770B\u4E0B\u65B9\u672A\u901A\u8FC7\u9879\uFF0C\u4EE5\u53CA\u4E0A\u65B9 AI \u7684\u5904\u7406\u8BF4\u660E\u3002":"\u8BF7\u7A0D\u5019\uFF0C\u6B63\u5728\u6838\u5BF9\u8FD9\u4E2A\u7248\u672C\u7684\u62A5\u544A\u3002"}),l&&g.measuredMm!==null?Qt("div",{className:"fp-gap-readout",children:[_n("span",{children:"\u6700\u5C0F\u81EA\u7531\u95F4\u9699"}),Qt("strong",{children:[g.measuredMm,_n("small",{children:" mm"})]}),Qt("span",{children:["\u8981\u6C42 ",g.requiredMm===null?"\u672A\u63D0\u4F9B":`\u2265 ${g.requiredMm} mm`]}),_n("p",{children:g.pair?`${y(g.pair.moving)} \u2194 ${y(g.pair.fixed)}`:"\u5BF9\u8C61\u5BF9\u672A\u63D0\u4F9B"})]}):_n("p",{className:"fp-warn",children:l?"\u62A5\u544A\u672A\u63D0\u4F9B\u53EF\u7528\u7684\u81EA\u7531\u95F4\u9699\u6570\u503C\uFF0C\u8BF7\u5C55\u5F00\u9A8C\u8BC1\u660E\u7EC6\u3002":i?.label??"\u62A5\u544A\u5F85\u6838\u5B9E"}),f.length?Qt("p",{className:"fp-warn",children:["\u672A\u901A\u8FC7\u9879\uFF1A",f.map(C=>`${M[C.id]??C.id}\uFF08${C.status==="BORDERLINE"?"\u5904\u5728\u8FB9\u754C":C.status==="FAIL"?"\u672A\u901A\u8FC7":"\u5C1A\u4E0D\u786E\u5B9A"}\uFF09`).join("\u3001")]}):null,_n("p",{className:"fp-muted",children:"\u4EC5\u8F6F\u4EF6\u51E0\u4F55\u68C0\u67E5\uFF0C\u672A\u9A8C\u8BC1\u5B9E\u7269\u3002"})]}),Qt("div",{className:"fp-delivery-actions",children:[m.map(C=>Qt("button",{type:"button",disabled:!c||r,onClick:()=>a(C),"data-fitplate":`delivery-download-${C.kind}`,children:["\u4E0B\u8F7D ",C.kind==="step"?"STEP":C.kind==="stl"?"STL":"\u62A5\u544A"]},C.artifactId)),c?null:_n("span",{className:"fp-muted",children:"\u5F53\u524D\u62A5\u544A\u672A\u6838\u5B9E\u6216\u672A\u901A\u8FC7\uFF1B\u8BCA\u65AD\u4E0B\u8F7D\u89C1\u7248\u672C\u8BB0\u5F55\u3002"})]}),Qt("details",{className:"fp-details fp-delivery-details",children:[_n("summary",{children:"\u6D4B\u91CF\u539F\u6587\u4E0E\u9A8C\u8BC1\u660E\u7EC6"}),Qt("p",{children:["\u65B9\u6848 ",e.candidateId," \xB7 \u8981\u6C42\u4FEE\u8BA2 ",n.taskRevision??"\u672A\u77E5"]}),l?Cu(o.clearance).map(C=>_n("p",{children:C},C)):null,_n("p",{children:"\u4EC5\u9A8C\u8BC1\u786E\u8BA4\u8F93\u5165\u4E0B\u7684\u8F6F\u4EF6\u51E0\u4F55\uFF1B\u672A\u505A\u5B9E\u7269\u88C5\u914D\u3001\u5F3A\u5EA6\u6216\u5236\u9020\u516C\u5DEE\u5B9E\u6D4B\u3002\u5382\u5546\u8BBE\u5907\u89C4\u683C\u4E0E\u81EA\u8BBE\u6761\u4EF6\u6309\u62A5\u544A\u5206\u522B\u6807\u6CE8\u3002"}),Qt("p",{children:["\u62A5\u544A\uFF1A",o.identity.reportId??"\u672A\u63D0\u4F9B","\uFF1B\u9010\u9879\u68C0\u67E5\uFF1A",o.checksComplete?"8 \u9879\u9F50\u5168":"\u5C1A\u4E0D\u5B8C\u6574","\uFF1B",i?.label??"\u672A\u6838\u5B9E"]}),Qt("p",{children:["STEP SHA-256\uFF1A",o.identity.stepSha256??"\u672A\u63D0\u4F9B"]}),Qt("p",{children:["\u62A5\u544A\u6587\u4EF6 SHA-256\uFF1A",e.reportFileSha256??"\u672A\u63D0\u4F9B"]}),Qt("p",{children:["\u62A5\u544A\u5185\u5BB9\u6458\u8981\uFF1A",e.reportSha256??"\u672A\u63D0\u4F9B"]})]})]})}var Lt=class extends Error{code;detail;constructor(e,t,i=""){super(t),this.name="MeshRejection",this.code=e,this.detail=i}},Pu=2e5,Cx=2*1024*1024,Du=/^[0-9a-f]{64}$/,Pf=/^v[0-9]{3}$/;function Ji(n){return typeof n=="string"&&Du.test(n)}function zr(n){return typeof n=="string"&&Pf.test(n)}function Rt(n){if(typeof n!="string")return"";let e=n.trim().toLowerCase();return Du.test(e)?e:""}function Ki(n){return typeof n=="number"&&Number.isFinite(n)}function Nu(n){if(!Array.isArray(n)||n.length!==3)return null;let[e,t,i]=n;return!Ki(e)||!Ki(t)||!Ki(i)?null:[e,t,i]}function Nf(n){if(n.length===0)return{min:[0,0,0],max:[0,0,0]};let e=[1/0,1/0,1/0],t=[-1/0,-1/0,-1/0];for(let i=0;i<n.length;i+=3)for(let s=0;s<3;s+=1){let r=n[i+s];r<e[s]&&(e[s]=r),r>t[s]&&(t[s]=r)}return{min:e,max:t}}function Df(n,e){let t=0;for(let i=0;i<3;i+=1)t=Math.max(t,Math.abs(n.min[i]-e.min[i]),Math.abs(n.max[i]-e.max[i]));return t}function Lu(n,e){if(n===null||typeof n!="object"||Array.isArray(n))throw new Lt("PAYLOAD_NOT_OBJECT","\u7F51\u683C\u54CD\u5E94\u4E0D\u662F\u5BF9\u8C61",typeof n);let t=n;if(t.schema_version!==void 0&&t.schema_version!=="1.0")throw new Lt("UNSUPPORTED_SCHEMA",`\u7F51\u683C\u54CD\u5E94 schema_version=${String(t.schema_version)}\uFF0C\u53EA\u652F\u6301 1.0`);if(!zr(t.candidate_id))throw new Lt("CANDIDATE_ID_MISMATCH",`\u7F51\u683C\u54CD\u5E94 candidate_id \u975E\u6CD5\uFF1A${String(t.candidate_id)}`);if(t.candidate_id!==e.candidateId)throw new Lt("CANDIDATE_ID_MISMATCH",`\u7F51\u683C\u5C5E\u4E8E\u5019\u9009 ${t.candidate_id}\uFF0C\u800C\u8981\u6E32\u67D3\u7684\u662F ${e.candidateId}`);let i=Rt(e.stepSha256);if(!i)throw new Lt("STEP_HASH_MISSING","\u7F3A\u5C11\u8981\u7ED1\u5B9A\u7684 STEP \u54C8\u5E0C\uFF0C\u62D2\u7EDD\u6E32\u67D3\u7F51\u683C");let s=Rt(t.step_sha256);if(!s)throw new Lt("STEP_HASH_MISSING","\u7F51\u683C\u54CD\u5E94\u6CA1\u6709\u643A\u5E26\u53EF\u6821\u9A8C\u7684 step_sha256");if(s!==i)throw new Lt("STEP_HASH_MISMATCH",`\u7F51\u683C\u7ED1\u5B9A\u7684 STEP \u54C8\u5E0C\u4E0E\u5019\u9009\u8BB0\u5F55\u4E0D\u4E00\u81F4\uFF08\u7F51\u683C ${s.slice(0,12)}\u2026\uFF0C\u8BB0\u5F55 ${i.slice(0,12)}\u2026\uFF09`);let r=t.vertices;if(!Array.isArray(r)||r.length===0||r.length%3!==0)throw new Lt("VERTICES_INVALID","vertices \u5FC5\u987B\u662F 3 \u7684\u500D\u6570\u957F\u5EA6\u7684\u975E\u7A7A\u6570\u7EC4",`len=${String(r?.length)}`);let a=t.indices;if(!Array.isArray(a)||a.length===0||a.length%3!==0)throw new Lt("INDICES_INVALID","indices \u5FC5\u987B\u662F 3 \u7684\u500D\u6570\u957F\u5EA6\u7684\u975E\u7A7A\u6570\u7EC4",`len=${String(a?.length)}`);let o=a.length/3;if(o>Pu)throw new Lt("TRIANGLE_BUDGET_EXCEEDED",`\u4E09\u89D2\u9762 ${o} \u8D85\u8FC7\u9884\u89C8\u9884\u7B97 ${Pu}`);let l=r.length/3,c=new Float32Array(r.length);for(let p=0;p<r.length;p+=1){let m=r[p];if(!Ki(m))throw new Lt("VERTICES_INVALID",`vertices[${p}] \u4E0D\u662F\u6709\u9650\u6570\u503C`,String(m));c[p]=m}let u=new Uint32Array(a.length);for(let p=0;p<a.length;p+=1){let m=a[p];if(typeof m!="number"||!Number.isInteger(m)||m<0||m>=l)throw new Lt("INDICES_INVALID",`indices[${p}]=${String(m)} \u8D8A\u754C\u6216\u975E\u6574\u6570\uFF08\u9876\u70B9\u6570 ${l}\uFF09`);u[p]=m}let d=Nf(c),h=null;if(t.bounds&&typeof t.bounds=="object"){let p=Nu(t.bounds.min),m=Nu(t.bounds.max);if(p&&m){h=Df(d,{min:p,max:m});let y=e.boundsToleranceMm??.5;if(h>y)throw new Lt("BOUNDS_DISAGREE",`\u9876\u70B9\u91CD\u7B97\u5305\u56F4\u76D2\u4E0E\u58F0\u660E\u503C\u76F8\u5DEE ${h.toFixed(3)}mm\uFF08\u5BB9\u9650 ${y}mm\uFF09\uFF0C\u7F51\u683C\u4E0E\u4EA7\u7269\u4E0D\u4E00\u81F4`)}}return{positions:c,indices:u,vertexCount:l,triangleCount:o,bounds:d,candidateId:t.candidate_id,stepSha256:s,toleranceMm:Ki(t.tolerance_mm)?t.tolerance_mm:null,angularToleranceRad:Ki(t.angular_tolerance_rad)?t.angular_tolerance_rad:null,boundsAgreementMm:h}}var Fn=["G01","G02","G03","G04","G05","G06","G07","G08"],Vu={G01:"\u5B9E\u4F53\u6709\u6548\u6027",G02:"\u677F\u4F53\u5C3A\u5BF8\u4E0E\u59FF\u6001",G03:"\u5E95\u5EA7\u901A\u5B54",G04:"\u4F20\u611F\u5668\u5B54\u7EC4 / \u4F4D\u59FF",G05:"\u5B54\u8FB9\u4E0E\u5B54\u95F4\u6750\u6599",G06:"\u88C5\u914D\u81EA\u7531\u7A7A\u95F4",G07:"\u56FA\u5B9A\u6761\u4EF6\u4FDD\u6301",G08:"\u5BFC\u51FA\u4E00\u81F4\u6027"};function Ml(n){return Je(n)?{min:$e(n.min),max:$e(n.max)}:null}function Al(n){if(!Je(n))return null;let e=Je(n.plate)?n.plate:null,t=e&&Je(e.editable)?e.editable:{},i={};for(let[u,d]of Object.entries(t)){let h=Ml(d);h&&(i[u]=h)}let s=Je(n.base_holes)?n.base_holes:null,r=Je(n.sensor)?n.sensor:null,a=r&&Array.isArray(r.body_size)?r.body_size:null,o=a&&a.length>=3&&$e(a[0])!==null&&$e(a[1])!==null&&$e(a[2])!==null?[a[0],a[1],a[2]]:null,l=Je(n.provenance)?n.provenance:null,c=Je(n.request)?n.request:null;return{taskId:Xe(n.task_id),revision:$e(n.revision)??$e(n.task_revision),requestText:Xe(n.request_text)??(c?Xe(c.text):null),plate:e?{width:$e(e.width),height:$e(e.height),thickness:$e(e.thickness),locked:Array.isArray(e.locked)?e.locked.filter(u=>typeof u=="string"):[],editable:i}:null,baseHoles:s?{diameter:$e(s.diameter),centers:Array.isArray(s.centers)?s.centers.flatMap(u=>{let d=Xn(u);return d?[d]:[]}):[],locked:s.locked===!0}:null,sensor:r?{modelId:Xe(r.model_id),bodySize:o,holeDiameter:$e(r.hole_diameter),holeOffsets:Array.isArray(r.hole_offsets)?r.hole_offsets.flatMap(u=>{let d=Xn(u);return d?[d]:[]}):[],allowedCenterX:Ml(r.allowed_center_x),allowedCenterY:Ml(r.allowed_center_y),allowedRotationDeg:Array.isArray(r.allowed_rotation_deg)?r.allowed_rotation_deg.flatMap(u=>$e(u)===null?[]:[u]):[]}:null,requirements:Je(n.requirements)?n.requirements:null,tolerances:Je(n.tolerances)?n.tolerances:null,provenance:Rl(l),summaryOnly:l===null,raw:n}}function Rl(n){if(!Je(n))return null;let e=Je(n.provenance)?n.provenance:n,t={kind:Xe(e.kind),source:Xe(e.source),reviewStatus:Xe(e.review_status)};return t.kind===null&&t.source===null&&t.reviewStatus===null?null:t}function Je(n){return n!==null&&typeof n=="object"&&!Array.isArray(n)}function $e(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function Xe(n){return typeof n=="string"&&n.length>0?n:null}function Xn(n){if(!Array.isArray(n)||n.length<2)return null;let e=$e(n[0]),t=$e(n[1]);return e===null||t===null?null:[e,t]}function Uu(n){if(!Array.isArray(n)||n.length<2)return null;let e=$e(n[0]),t=$e(n[1]);return e===null||t===null||t<e?null:[e,t]}function Fu(n){if(!Je(n))return null;let e=$e(n.min),t=$e(n.max);return e===null||t===null||t<e?null:[e,t]}var Lf=["PASS","FAIL","UNKNOWN","BORDERLINE"];function wl(n){return typeof n=="string"&&Lf.includes(n)?n:null}function Gr(n){if(!Je(n))return null;let e=wl(n.overall);if(e===null)return null;let t=[],i=Array.isArray(n.checks)?n.checks:[];for(let r of i){if(!Je(r))continue;let a=wl(r.status),o=Xe(r.id);if(a===null||o===null)continue;let l=Array.isArray(r.objects)?r.objects.filter(c=>typeof c=="string"):[];t.push({id:Fn.includes(o)?o:"G01",rawId:o,status:a,objects:l,measured:Je(r.measured)?r.measured:{},required:Je(r.required)?r.required:{},...Xe(r.reason_code)?{reasonCode:Xe(r.reason_code)}:{},...Xe(r.evidence_ref)?{evidenceRef:Xe(r.evidence_ref)}:{},...Xe(r.note)?{note:Xe(r.note)}:{}})}let s=Je(n.hashes)?n.hashes:{};return{reportId:Xe(n.report_id)??"(\u672A\u547D\u540D\u62A5\u544A)",overall:e,taskRevision:$e(n.task_revision),createdAt:Xe(n.created_at),validatorVersion:Xe(n.validator_version),candidateId:Xe(n.candidate_id),stepSha256:Ji(s.step_sha256)?s.step_sha256:null,checks:t,errors:Array.isArray(n.errors)?n.errors.flatMap(r=>Je(r)&&Xe(r.code)?[{code:String(r.code),message:Xe(r.message)??""}]:[]):[],raw:n}}function ci(n){if(!n)return Fn.map(()=>null);let e=new Map;for(let t of n.checks)e.has(t.rawId??t.id)||e.set(t.rawId??t.id,t);return Fn.map(t=>e.get(t)??null)}function Cl(n,e,t,i){return n?i&&n.candidateId&&i!==n.candidateId?{state:"stale-binding",label:"\u62A5\u544A\u4E0E\u5F53\u524D\u5019\u9009\u4E0D\u5339\u914D\uFF08\u5DF2\u5931\u6548\uFF09"}:n.stepSha256!==null&&t!==null&&n.stepSha256!==t?{state:"stale-binding",label:"\u62A5\u544A\u4E0E\u5F53\u524D STEP \u4E0D\u5339\u914D\uFF08\u5DF2\u5931\u6548\uFF09"}:n.taskRevision!==null&&e!==null&&n.taskRevision!==e?{state:"stale-revision",label:`\u6309\u65E7\u8981\u6C42 revision ${n.taskRevision} \u901A\u8FC7/\u5931\u8D25\uFF08\u5F53\u524D revision ${e}\uFF09`}:n.taskRevision===null||n.stepSha256===null||e===null||t===null||n.candidateId===null||!Je(n.raw)||Xe(n.raw.report_id)===null?{state:"unverified-metadata",label:"\u62A5\u544A\u7F3A\u5C11 revision/\u5019\u9009/STEP/\u62A5\u544A\u8EAB\u4EFD\u5143\u6570\u636E\uFF0C\u65E0\u6CD5\u786E\u8BA4\u4E0E\u5F53\u524D\u8981\u6C42\u4E00\u81F4"}:{state:"current",label:"\u4E0E\u5F53\u524D\u8981\u6C42\u4E00\u81F4"}:{state:"missing",label:"\u5C1A\u65E0\u9A8C\u8BC1\u62A5\u544A"}}function Hr(n){if(!n)return[];let e=new Set;for(let t of n.checks)if(t.status!=="PASS")for(let i of t.objects)e.add(i);return[...e]}function Hu(n,e){return n?ci(n)[Fn.indexOf(e)]?.objects??[]:[]}function Wr(n){if(!Je(n))return null;let e=Array.isArray(n.pairs)?n.pairs:Je(n.sensor_group)&&Array.isArray(n.sensor_group.pairs)?n.sensor_group.pairs:null;if(!e)return null;let t=[],i=0;for(let c of e){if(!Je(c)){i+=1;continue}let u=Xe(c.moving),d=Xe(c.fixed);if(!u||!d){i+=1;continue}t.push({moving:u,fixed:d,distanceMm:$e(c.distance_mm),intersectionVolumeMm3:$e(c.intersection_volume_mm3),allowedSupport:c.allowed_support===!0,requiredClearanceMm:$e(c.required_clearance_mm),status:Xe(c.status),reasonCode:Xe(c.reason_code)})}if(t.length===0)return null;let s=(c,u)=>{if(c.distanceMm===null)return!1;if(u.distanceMm===null)return!0;let d=Math.round(c.distanceMm*1e6),h=Math.round(u.distanceMm*1e6);return d!==h?d<h:c.moving!==u.moving?c.moving<u.moving:c.fixed<u.fixed},r=null,a=null,o=null,l=[];for(let c of t){c.distanceMm!==null&&((a===null||s(c,a))&&(a=c),!c.allowedSupport&&(r===null||s(c,r))&&(r=c));let u=c.intersectionVolumeMm3??-1;(o===null||u>(o.intersectionVolumeMm3??-1))&&(o=c),(c.status==="FAIL"||(c.intersectionVolumeMm3??0)>0)&&l.push(c)}return{pairs:t,evidenceComplete:t.length>0&&i===0&&t.every(c=>c.distanceMm!==null),minimumFreeClearanceMm:r?.distanceMm??null,freeClearancePair:r,minimumContactDistanceMm:a?.distanceMm??null,failingPairs:l,worstPair:o,maxIntersectionMm3:o?.intersectionVolumeMm3??null}}function Uf(n){if(!n.evidenceComplete)return null;let e=n.pairs.filter(t=>t.allowedSupport);return e.length===0?"NONE":e.some(t=>t.status==="FAIL"&&t.reasonCode==="SOLID_INTERFERENCE")?"PENETRATION":e.some(t=>t.status==="FAIL")?"NOT_SEATED":e.some(t=>t.status==="BORDERLINE")?"GAP_BORDERLINE":"SEATED"}var Vr=n=>Math.round(n*1e6);function Ff(n,e){let t=Object.hasOwn(n,"minimum_free_clearance_mm"),i=n.minimum_free_clearance_mm,s=t&&i===null,r=t&&typeof i=="number"&&Number.isFinite(i),a=t&&!s&&!r,o=Object.hasOwn(n,"minimum_free_clearance_pair"),l=n.minimum_free_clearance_pair,c=o&&l===null,u=o&&Je(l)&&Xe(l.moving)!==null&&Xe(l.fixed)!==null?{moving:Xe(l.moving),fixed:Xe(l.fixed)}:null,d=o&&!c&&u===null,h=e!==null&&e.evidenceComplete,p=a||d||o&&!t;t&&!a&&!d&&(r&&u===null&&(p=!0),s&&!c&&(p=!0));let m=e?e.minimumFreeClearanceMm:null,y=e?.freeClearancePair??null,g=!1,f=null;if(p)f="\u62A5\u544A\u7684\u81EA\u7531\u95F4\u9699\u6458\u8981\u5B57\u6BB5\u65E0\u6548\uFF08\u4E0D\u662F\u6709\u9650\u6570\u503C\u6216\u5BF9\u8C61\u5BF9\u5F62\u72B6\u4E0D\u7B26\uFF09\uFF0C\u4E0D\u80FD\u5F53\u4F5C\u5DF2\u6D4B\u7ED3\u679C";else if(t&&h){if(s!==(m===null))g=!0,f='\u62A5\u544A\u6458\u8981\u4E0E\u9010\u5BF9\u8BC1\u636E\u5BF9"\u662F\u5426\u5B58\u5728\u81EA\u7531\u5BF9\u8C61\u5BF9"\u8BF4\u6CD5\u4E0D\u4E00\u81F4\uFF0C\u4E0D\u80FD\u636E\u6B64\u5224\u597D';else if(r&&Vr(i)!==Vr(m))g=!0,f=`\u62A5\u544A\u6458\u8981 ${i} mm \u4E0E\u9010\u5BF9\u8BC1\u636E ${m} mm \u4E0D\u4E00\u81F4\uFF0C\u4E0D\u80FD\u636E\u6B64\u5224\u597D`;else if(r&&u!==null){let I=e.pairs.find(v=>v.moving===u.moving&&v.fixed===u.fixed);I?I.allowedSupport?(g=!0,f="\u62A5\u544A\u6458\u8981\u70B9\u540D\u7684\u5BF9\u8C61\u5BF9\u662F\u5141\u8BB8\u652F\u6491\u63A5\u89E6\uFF0C\u4E0E\u81EA\u7531\u95F4\u9699\u53E3\u5F84\u4E0D\u4E00\u81F4\uFF0C\u4E0D\u80FD\u636E\u6B64\u5224\u597D"):I.distanceMm===null||Vr(I.distanceMm)!==Vr(i)?(g=!0,f=`\u62A5\u544A\u6458\u8981\u70B9\u540D ${u.moving} \u2194 ${u.fixed}\uFF0C\u4F46\u9010\u5BF9\u8BC1\u636E\u91CC\u8BE5\u5BF9\u8DDD\u79BB\u662F ${I.distanceMm} mm\uFF0C\u4E0E\u6458\u8981\u503C ${i} mm \u4E0D\u7B26`):y!==null&&(y.moving!==u.moving||y.fixed!==u.fixed)&&(g=!0,f="\u62A5\u544A\u6458\u8981\u70B9\u540D\u7684\u5BF9\u8C61\u5BF9\u4E0D\u662F\u9010\u5BF9\u8BC1\u636E\u7684\u6700\u5C0F\u81EA\u7531\u5BF9\uFF08\u540C\u8DDD\u6309 (moving, fixed) \u7A33\u5B9A\u7834\u5E73\uFF09\uFF0C\u4E0D\u80FD\u636E\u6B64\u5224\u597D"):(g=!0,f="\u62A5\u544A\u6458\u8981\u70B9\u540D\u7684\u5BF9\u8C61\u5BF9\u4E0D\u5728\u9010\u5BF9\u8BC1\u636E\u4E2D\uFF0C\u65E0\u6CD5\u6838\u5BF9")}}return{source:t?"report":e?"pairs":"none",minimumFreeClearanceMm:p?null:r?i:t?null:m,pair:p?null:t?u:y,noFreePair:!p&&!g&&h&&(t&&s||!t&&m===null),inconsistent:g,note:f,confidence:p?"none":t?h&&!g?"verified":"declared":e?h?"verified":"declared":"none",malformed:p,evidenceComplete:h}}var Of={SOLID_INVALID:"\u5B9E\u4F53\u65E0\u6548",NO_SOLID:"STEP \u4E2D\u6CA1\u6709\u5B9E\u4F53",MULTIPLE_OR_FREE_BODIES:"\u5B58\u5728\u591A\u4E2A\u5B9E\u4F53\u6216\u6E38\u79BB\u4F53",NON_POSITIVE_VOLUME:"\u4F53\u79EF\u975E\u6B63",UNSUPPORTED_FEATURE:"\u542B\u4E0D\u652F\u6301\u7684\u51E0\u4F55\u7279\u5F81",PLATE_GEOMETRY_MISMATCH:"\u677F\u4F53\u51E0\u4F55\u4E0E\u51BB\u7ED3\u8981\u6C42\u4E0D\u7B26",PLATE_SIZE_MISMATCH:"\u677F\u4F53\u5C3A\u5BF8\u4E0E\u51BB\u7ED3\u8981\u6C42\u4E0D\u7B26",AMBIGUOUS_BASE_HOLE_MATCH:"\u5E95\u5EA7\u5B54\u5339\u914D\u4E0D\u552F\u4E00",BASE_HOLE_MISSING_OR_DISPLACED:"\u5E95\u5EA7\u5B54\u7F3A\u5931\u6216\u4F4D\u7F6E\u504F\u79BB",BASE_HOLE_MISMATCH:"\u5E95\u5EA7\u5B54\u4E0E\u51BB\u7ED3\u8981\u6C42\u4E0D\u7B26",SENSOR_HOLE_MISSING:"\u7F3A\u5C11\u4F20\u611F\u5668\u5B89\u88C5\u5B54",SENSOR_HOLE_EXTRA:"\u5B58\u5728\u591A\u4F59\u7684\u4F20\u611F\u5668\u5B54",SENSOR_HOLE_DIAMETER:"\u4F20\u611F\u5668\u5B54\u5F84\u8D85\u51FA\u516C\u5DEE",SENSOR_HOLE_COUNT_MISMATCH:"\u4F20\u611F\u5668\u5B54\u6570\u91CF\u4E0D\u7B26",SENSOR_HOLE_PATTERN_MISMATCH:"\u4F20\u611F\u5668\u5B54\u7EC4\u5F62\u72B6\u4E0D\u7B26",SENSOR_HOLE_MISMATCH:"\u4F20\u611F\u5668\u5B54\u4E0E\u8981\u6C42\u4E0D\u7B26",AMBIGUOUS_SENSOR_POSE:"\u4F20\u611F\u5668\u4F4D\u59FF\u4E0D\u552F\u4E00",EDGE_LIGAMENT:"\u5B54\u8FB9\u6750\u6599\u4E0D\u8DB3",HOLE_LIGAMENT:"\u5B54\u95F4\u6750\u6599\u4E0D\u8DB3",LIGAMENT_VIOLATION:"\u5B54\u8FB9/\u5B54\u95F4\u6750\u6599\u4E0D\u8DB3",NO_HOLES_IDENTIFIED:"\u672A\u8BC6\u522B\u5230\u5B54",SOLID_INTERFERENCE:"\u5B9E\u4F53\u5E72\u6D89\uFF1A\u64CD\u4F5C\u7A7A\u95F4\u4E0E\u56FA\u5B9A\u5BF9\u8C61\u76F8\u4EA4",CLEARANCE_VIOLATION:"\u81EA\u7531\u95F4\u9699\u5C0F\u4E8E\u8981\u6C42",ASSEMBLY_CONSTRAINT:"\u88C5\u914D\u7EA6\u675F\u4E0D\u6EE1\u8DB3",UPSTREAM_G03_NOT_MATCHED:"\u4E0A\u6E38 G03\uFF08\u5E95\u5EA7\u5B54\uFF09\u672A\u901A\u8FC7\uFF0C\u672C\u9879\u65E0\u6CD5\u5224\u65AD",UPSTREAM_G04_NOT_PASSED:"\u4E0A\u6E38 G04\uFF08\u4F20\u611F\u5668\u5B54\u7EC4\uFF09\u672A\u901A\u8FC7\uFF0C\u672C\u9879\u65E0\u6CD5\u5224\u65AD",UPSTREAM_ARTEFACT_UNREADABLE:"\u4EA7\u7269\u4E0D\u53EF\u8BFB\uFF0C\u68C0\u67E5\u672A\u6267\u884C",SCENE_HASH_MISMATCH:"\u51BB\u7ED3\u573A\u666F\u4E0E\u5F15\u7528\u54C8\u5E0C\u4E0D\u4E00\u81F4",FROZEN_CONDITION_CHANGED:"\u51BB\u7ED3\u6761\u4EF6\u88AB\u6539\u52A8",STL_NOT_PROVIDED:"\u7F3A\u5C11 STL \u5BFC\u51FA",EXPORT_INCONSISTENT:"\u5BFC\u51FA\u7ED3\u679C\u4E0E STEP \u4E0D\u4E00\u81F4",PREVIEW_MESH_NOT_PROVIDED:"\u672A\u63D0\u4F9B\u9884\u89C8\u7F51\u683C",PREVIEW_MESH_UNREADABLE:"\u9884\u89C8\u7F51\u683C\u4E0D\u53EF\u8BFB",PREVIEW_MESH_MALFORMED:"\u9884\u89C8\u7F51\u683C\u683C\u5F0F\u9519\u8BEF",PREVIEW_MESH_HASH_MISMATCH:"\u9884\u89C8\u7F51\u683C\u54C8\u5E0C\u4E0E STEP \u4E0D\u7B26",PREVIEW_MESH_CANDIDATE_MISMATCH:"\u9884\u89C8\u7F51\u683C\u5C5E\u4E8E\u5176\u4ED6\u5019\u9009",PREVIEW_MESH_UNVERIFIABLE:"\u9884\u89C8\u7F51\u683C\u65E0\u6CD5\u6821\u9A8C",PREVIEW_MESH_TRIANGLE_MISMATCH:"\u9884\u89C8\u7F51\u683C\u4E09\u89D2\u9762\u4E0E\u62A5\u544A\u4E0D\u7B26",PREVIEW_MESH_BOUNDS_MISMATCH:"\u9884\u89C8\u7F51\u683C\u5305\u56F4\u76D2\u4E0D\u7B26",PREVIEW_MESH_DEGENERATE_TRIANGLE:"\u9884\u89C8\u7F51\u683C\u542B\u9000\u5316\u4E09\u89D2\u9762",PREVIEW_MESH_TOLERANCE_MISSING:"\u9884\u89C8\u7F51\u683C\u7F3A\u5C11\u5BB9\u5DEE",PREVIEW_MESH_TOLERANCE_OUT_OF_RANGE:"\u9884\u89C8\u7F51\u683C\u5BB9\u5DEE\u8D85\u51FA\u8303\u56F4",STALE_INPUT:"\u8F93\u5165\u5DF2\u8FC7\u671F\uFF08\u91CD\u65B0\u8FD0\u884C\u540E\u518D\u9A8C\u8BC1\uFF09"};function Gu(n){if(!n)return null;let e=Of[n];return{label:e??n,code:n,known:e!==void 0}}function Ae(n){return n==null?"\u672A\u6D4B\u91CF":typeof n=="number"?!Number.isFinite(n)||Number.isInteger(n)?String(n):n.toFixed(4).replace(/0+$/,"").replace(/\.$/,""):typeof n=="boolean"?n?"\u662F":"\u5426":Array.isArray(n)?n.map(e=>Ae(e)).join(", "):Je(n)?JSON.stringify(n):String(n)}function Oe(n,e){return $e(n[e])}function El(n,e){let t=n[e];return typeof t=="boolean"?t:null}function Tl(n,e){return Xe(n[e])}function Wn(n){return`${Ae(n)} mm`}function Ou(n,e,t){return n!==null&&e!==null?n===e?`\u2300${Ae(n)} mm`:`\u2300${Ae(n)}\u2013${Ae(e)} mm`:t!==null?`\u2300${Ae(t)} mm`:null}function Il(n,e={}){if(!n)return[];let t=kf(n.id,n.measured,n.required,e.pairs??null);if(t.length===0)for(let[i,s]of Object.entries(n.measured).slice(0,4))t.push({label:i,value:Ae(s)});return t.slice(0,6)}function kf(n,e,t,i){let s=[],r=Oe(e,"dimensional_tolerance_mm")??Oe(t,"dimensional_tolerance_mm")??null;switch(n){case"G01":{let a=Oe(e,"volume_mm3");a!==null&&s.push({label:"\u5B9E\u6D4B\u4F53\u79EF",value:`${Ae(a)} mm\xB3`});let o=Oe(e,"solid_count");o!==null&&s.push({label:"\u5B9E\u4F53\u6570",value:o===1?"1\uFF08\u5355\u4E00\u8FDE\u901A\u5B9E\u4F53\uFF09":Ae(o),tone:o===1?"ok":"warn"});let l=Oe(e,"free_shape_count");l!==null&&s.push({label:"\u6E38\u79BB\u5F62\u72B6",value:l===0?"\u65E0":Ae(l),tone:l===0?void 0:"warn"});let c=Oe(e,"missing_material_mm3"),u=Oe(e,"unexpected_material_mm3");if(c!==null||u!==null){let d=(c??0)>0||(u??0)>0;s.push({label:"\u7F3A\u5931/\u591A\u4F59\u6750\u6599",value:`${Ae(c??0)} / ${Ae(u??0)} mm\xB3`,tone:d?"warn":"ok"})}break}case"G02":{let a=Oe(e,"width_mm"),o=Oe(e,"height_mm"),l=Oe(e,"thickness_mm");a!==null&&o!==null&&l!==null&&s.push({label:"\u5B9E\u6D4B\u5C3A\u5BF8",value:`${Ae(a)} \xD7 ${Ae(o)} \xD7 ${Ae(l)} mm`,hint:"\u5BBD \xD7 \u9AD8 \xD7 \u539A"});let c=["width_deviation_mm","height_deviation_mm","thickness_deviation_mm"].map(u=>Oe(e,u)).filter(u=>u!==null);if(c.length>0){let u=Math.max(...c.map(d=>Math.abs(d)));s.push({label:"\u5C3A\u5BF8\u504F\u5DEE\uFF08\u6700\u5927\uFF09",value:Wn(u),tone:r!==null&&u>r?"warn":"ok"})}r!==null&&s.push({label:"\u5141\u8BB8\u504F\u5DEE",value:`\xB1${Ae(r)} mm`,tone:"muted"});break}case"G03":{let a=Oe(e,"base_hole_count")??Oe(t,"base_hole_count");a!==null&&s.push({label:"\u5B54\u6570",value:`${Ae(a)} \u4E2A`});let o=Ou(Oe(e,"min_measured_diameter_mm"),Oe(e,"max_measured_diameter_mm"),null);if(o!==null)s.push({label:"\u5B9E\u6D4B\u5B54\u5F84",value:o});else{let u=Oe(t,"base_hole_diameter_mm");u!==null&&s.push({label:"\u8981\u6C42\u5B54\u5F84",value:`\u2300${Ae(u)} mm`,tone:"muted"})}let l=Oe(e,"worst_center_deviation_mm");l!==null&&s.push({label:"\u4E2D\u5FC3\u504F\u5DEE\uFF08\u6700\u5927\uFF09",value:Wn(l),tone:r!==null&&l>r?"warn":"ok"});let c=Oe(e,"non_through_holes");c!==null&&s.push({label:"\u672A\u901A\u5B54",value:c===0?"\u65E0":`${Ae(c)} \u4E2A`,tone:c===0?void 0:"warn"});break}case"G04":{let a=Oe(e,"hole_count")??Oe(t,"hole_count");a!==null&&s.push({label:"\u5B54\u6570",value:`${Ae(a)} \u4E2A`});let o=Ou(Oe(e,"min_measured_diameter_mm"),Oe(e,"max_measured_diameter_mm"),Oe(t,"hole_diameter_mm"));o!==null&&s.push({label:"\u5B54\u5F84",value:o});let l=Oe(e,"pose_solutions");l!==null&&s.push({label:"\u4F4D\u59FF\u89E3",value:l===1?"1\uFF08\u552F\u4E00\u89E3\uFF09":`${Ae(l)}\uFF08\u4E0D\u552F\u4E00\uFF09`,tone:l===1?"ok":"warn",hint:"\u7531 STEP \u5B9E\u9645\u5B54\u7EC4\u63A8\u5BFC\uFF1B\u53EA\u6709\u552F\u4E00\u89E3\u624D\u80FD\u7528\u4E8E\u88C5\u914D\u5224\u65AD"});let c=Oe(e,"derived_center_x_mm"),u=Oe(e,"derived_center_y_mm");c!==null&&u!==null&&s.push({label:"\u5B9E\u6D4B\u4E2D\u5FC3",value:`(${Ae(c)}, ${Ae(u)}) mm`,hint:"\u677F\u9762\u5750\u6807\u7CFB"});let d=Oe(e,"worst_pattern_deviation_mm");d!==null&&s.push({label:"\u5B54\u7EC4\u504F\u5DEE\uFF08\u6700\u5927\uFF09",value:Wn(d),tone:r!==null&&d>r?"warn":"ok"});break}case"G05":{let a=Oe(e,"holes_checked");a!==null&&s.push({label:"\u68C0\u67E5\u5B54\u6570",value:`${Ae(a)} \u4E2A`});let o=Oe(e,"minimum_edge_ligament_mm")??Oe(e,"min_edge_ligament_mm"),l=Oe(t,"minimum_edge_ligament_mm");if(o!==null){let h=Tl(e,"tightest_edge_hole");s.push({label:"\u6700\u5C0F\u5B54\u8FB9\u6750\u6599",value:`${Wn(o)}${l!==null?`\uFF08\u8981\u6C42 \u2265${Ae(l)} mm\uFF09`:""}`,tone:l!==null&&o<l?"warn":"ok",...h?{hint:`\u6700\u7D27\u5904\uFF1A${h}`}:{}})}let c=Oe(e,"minimum_hole_ligament_mm"),u=Oe(t,"minimum_hole_ligament_mm");if(c!==null){let h=Tl(e,"tightest_hole_pair");s.push({label:"\u6700\u5C0F\u5B54\u95F4\u6750\u6599",value:`${Wn(c)}${u!==null?`\uFF08\u8981\u6C42 \u2265${Ae(u)} mm\uFF09`:""}`,tone:u!==null&&c<u?"warn":"ok",...h?{hint:`\u6700\u7D27\u5904\uFF1A${h}`}:{}})}let d=Oe(e,"unexplained_holes");d!==null&&s.push({label:"\u672A\u89E3\u91CA\u5B54",value:d===0?"\u65E0":`${Ae(d)} \u4E2A`,tone:d===0?void 0:"warn"});break}case"G06":{let a=Oe(t,"minimum_free_clearance_mm"),o=Ff(e,i),l=a!==null?`\uFF08\u8981\u6C42 \u2265${Ae(a)} mm\uFF09`:"";if(o.inconsistent||o.malformed)s.push({label:"\u6700\u5C0F\u81EA\u7531\u95F4\u9699",value:o.minimumFreeClearanceMm!==null?`${Wn(o.minimumFreeClearanceMm)}${l}`:"\u65E0\u6CD5\u6838\u5BF9",tone:"warn",hint:o.note??"\u62A5\u544A\u6458\u8981\u4E0E\u9010\u5BF9\u8BC1\u636E\u4E0D\u4E00\u81F4\uFF0C\u4E0D\u80FD\u636E\u6B64\u5224\u597D"});else if(o.minimumFreeClearanceMm!==null){let C=o.confidence==="verified";s.push({label:"\u6700\u5C0F\u81EA\u7531\u95F4\u9699",value:`${Wn(o.minimumFreeClearanceMm)}${l}${C?"":"\u30FB\u672A\u6838\u5BF9"}`,tone:a!==null&&o.minimumFreeClearanceMm<a?"warn":C?"ok":"muted",hint:C?o.pair?`\u6700\u7D27\u5904\uFF1A${o.pair.moving} \u2194 ${o.pair.fixed}\uFF1B\u5DF2\u6392\u9664\u5141\u8BB8\u652F\u6491\u63A5\u89E6`:"\u5DF2\u6392\u9664\u5141\u8BB8\u652F\u6491\u63A5\u89E6":"\u62A5\u544A\u58F0\u660E\u503C\uFF1A\u6CA1\u6709\uFF08\u5B8C\u6574\u7684\uFF09\u9010\u5BF9\u8BC1\u636E\u53EF\u6838\u5BF9\uFF0C\u4E0D\u80FD\u5F53\u4F5C\u5DF2\u6D4B\u6B63\u5E38\u7ED3\u679C"})}else o.noFreePair?s.push({label:"\u6700\u5C0F\u81EA\u7531\u95F4\u9699",value:"\u65E0\u81EA\u7531\u5BF9\u8C61\u5BF9",tone:"muted",hint:"\u9010\u5BF9\u8BC1\u636E\u6838\u5BF9\u8FC7\uFF1A\u5DF2\u6D4B\u5BF9\u8C61\u5BF9\u90FD\u662F\u5141\u8BB8\u652F\u6491\u63A5\u89E6\uFF1B\u6CA1\u6709\u81EA\u7531\uFF08\u975E\u652F\u6491\uFF09\u5BF9\u8C61\u5BF9\uFF0C\u4E0D\u80FD\u62FF 0 \u5F53\u81EA\u7531\u95F4\u9699"}):o.source==="report"?s.push({label:"\u6700\u5C0F\u81EA\u7531\u95F4\u9699",value:"\u672A\u6838\u5BF9",tone:"muted",hint:"\u62A5\u544A\u58F0\u660E\u6CA1\u6709\u81EA\u7531\u5BF9\u8C61\u5BF9\uFF0C\u4F46\u7F3A\u5C11\uFF08\u5B8C\u6574\uFF09\u9010\u5BF9\u8BC1\u636E\u6838\u5BF9\uFF1B\u4E0D\u80FD\u5F53\u4F5C\u5DF2\u6D4B\u7ED3\u679C"}):s.push({label:"\u6700\u5C0F\u81EA\u7531\u95F4\u9699",value:"\u672A\u6D4B\u91CF",tone:"muted",hint:"\u54CD\u5E94\u672A\u63D0\u4F9B\u9010\u5BF9\uFF08pairs\uFF09\u95F4\u9699\u8BC1\u636E\u6216\u72EC\u7ACB\u81EA\u7531\u95F4\u9699\u6458\u8981\uFF0C\u4E0D\u80FD\u7528\u62A5\u544A\u6C47\u603B\u503C\u4EE3\u66FF"});let c={SEATED:{value:"\u8D34\u5408\u6B63\u5E38\uFF08\u5141\u8BB8\u63A5\u89E6\uFF0C\u65E0\u7A7F\u900F\uFF09",tone:"ok",hint:"\u5141\u8BB8\u652F\u6491\u63A5\u89E6\u53EF\u4EE5\u8D34\u5408\uFF0C\u4F46\u4E0D\u5141\u8BB8\u7A7F\u900F"},GAP_BORDERLINE:{value:"\u63A5\u89E6\u95F4\u9699\u5904\u4E8E\u4E34\u754C\u5E26",tone:"warn",hint:"\u5728\u6570\u503C\u4E0D\u786E\u5B9A\u5E26\u5185\uFF1A\u9700\u8981\u66F4\u5927\u4F59\u91CF\u6216\u4EBA\u5DE5\u590D\u6838"},NOT_SEATED:{value:"\u672A\u8D34\u5408\uFF08\u5141\u8BB8\u652F\u6491\u63A5\u89E6\u7F3A\u5931\uFF09",tone:"warn",hint:"\u58F0\u660E\u4E3A\u652F\u6491\u7684\u5BF9\u8C61\u5BF9\u6CA1\u6709\u63A5\u89E6\uFF0C\u8BBE\u5907\u5904\u4E8E\u60AC\u7A7A"},PENETRATION:{value:"\u7A7F\u900F\uFF08\u4E0D\u5141\u8BB8\uFF09",tone:"warn",hint:"\u5141\u8BB8\u63A5\u89E6\u4E0D\u5141\u8BB8\u7A7F\u900F\uFF0C\u8BE5\u5BF9\u8C61\u5BF9\u6309 FAIL \u8BA1"},NONE:{value:"\u65E0\u5141\u8BB8\u652F\u6491\u63A5\u89E6\u5BF9",tone:"muted",hint:"\u8BE5\u88C5\u914D\u6CA1\u6709\u58F0\u660E\u652F\u6491\u63A5\u89E6\uFF0C\u6B64\u72B6\u6001\u4E0D\u4EE3\u8868\u8D34\u5408"},POSE_UNKNOWN:{value:"\u4F4D\u59FF\u672A\u77E5\uFF0C\u672A\u6D4B\u91CF",tone:"muted",hint:"G04 \u672A\u901A\u8FC7\u65F6\u6CA1\u6709\u4EFB\u4F55\u88C5\u914D\u6D4B\u91CF\uFF0C\u4E5F\u6CA1\u6709\u7F16\u9020\u7684\u6570\u5B57"}},u=Xe(e.support_contact_status),d=i!==null?Uf(i):null;if(u!==null){let C=c[u],S=C?.value??u;if(u==="POSE_UNKNOWN")s.push({label:"\u652F\u6491\u63A5\u89E6",value:S,tone:"muted",hint:C?.hint});else if(o.evidenceComplete)d!==null&&d!==u?s.push({label:"\u652F\u6491\u63A5\u89E6",value:`${S}\uFF08\u4E0E\u9010\u5BF9\u8BC1\u636E\u4E0D\u4E00\u81F4\uFF1A\u8BC1\u636E\u5224 ${c[d]?.value??d}\uFF09`,tone:"warn",hint:"\u62A5\u544A\u6458\u8981\u4E0E\u9010\u5BF9\u8BC1\u636E\u7684\u652F\u6491\u63A5\u89E6\u72B6\u6001\u4E0D\u4E00\u81F4\uFF0C\u4E0D\u80FD\u636E\u6B64\u5224\u597D"}):s.push({label:"\u652F\u6491\u63A5\u89E6",value:S,...C?.tone?{tone:C.tone}:{},...C?.hint?{hint:C.hint}:{}});else{let E=!["SEATED","NONE"].includes(u);s.push({label:"\u652F\u6491\u63A5\u89E6",value:`${S}\u30FB\u62A5\u544A\u58F0\u660E\uFF0C\u672A\u6838\u5BF9`,tone:E?"warn":"muted",hint:"\u7F3A\u5C11\uFF08\u5B8C\u6574\uFF09\u9010\u5BF9\u8BC1\u636E\u6838\u5BF9\u652F\u6491\u63A5\u89E6\u72B6\u6001\uFF0C\u4E0D\u80FD\u5F53\u4F5C\u5DF2\u6838\u5BF9\u7ED3\u679C"})}}else if(d!==null&&!o.inconsistent&&!o.malformed){let C=c[d];s.push({label:"\u652F\u6491\u63A5\u89E6",value:C?.value??d,...C?.tone?{tone:C.tone}:{},hint:"\u7531\u9010\u5BF9\u8BC1\u636E\u63A8\u5BFC\uFF08\u65E7\u62A5\u544A\u6CA1\u6709\u8BE5\u6458\u8981\u5B57\u6BB5\uFF09"})}let h=Oe(e,"maximum_intersection_volume_mm3")??Oe(e,"intersection_volume_mm3"),p=Oe(t,"interference_volume_epsilon_mm3");if(h!==null){let C=p!==null?h>p:h>0;s.push({label:"\u6700\u5927\u5E72\u6D89\u4F53\u79EF",value:`${Ae(h)} mm\xB3`,tone:C?"warn":"ok"})}let m=Oe(e,"pairs_checked"),y=Oe(e,"failing_pairs")??(i?i.failingPairs.length:null);(m!==null||y!==null)&&s.push({label:"\u68C0\u67E5\u5BF9",value:m!==null?`${Ae(m)} \u5BF9${y!==null?`\uFF08\u5931\u8D25 ${Ae(y)}\uFF09`:""}`:`\u5931\u8D25 ${Ae(y??0)} \u5BF9`,tone:y!==null&&y>0?"warn":void 0});let g=Tl(e,"worst_pair");g===null&&i&&i.failingPairs.length>0&&i.worstPair&&(g=`${i.worstPair.moving}/${i.worstPair.fixed}`),g!==null&&y!==null&&y>0&&s.push({label:"\u5E72\u6D89\u5BF9\u8C61",value:g.replace("/"," \u2194 "),tone:"warn"});let f=i?.minimumContactDistanceMm??null,M=f??Oe(e,"minimum_pair_distance_mm")??Oe(e,"minimum_clearance_mm");M!==null&&!o.inconsistent&&(o.minimumFreeClearanceMm===null||M<o.minimumFreeClearanceMm)&&s.push({label:"\u542B\u5141\u8BB8\u652F\u6491\u6700\u5C0F\u8DDD\u79BB",value:Wn(M),tone:"muted",hint:f!==null?"\u8BBE\u5907\u4E0E\u677F\u7684\u8D34\u5408\u7B49\u5141\u8BB8\u652F\u6491\u63A5\u89E6\u4E0D\u7B97\u81EA\u7531\u95F4\u9699":"minimum_pair_distance_mm \u662F\u5168\u5BF9\u6700\u5C0F\u503C\uFF08\u65E7\u5B57\u6BB5 minimum_clearance_mm \u540C\u4E49\uFF0C\u542B\u5141\u8BB8\u63A5\u89E6\uFF09\uFF0C\u4E0D\u80FD\u5F53\u81EA\u7531\u95F4\u9699"});break}case"G07":{let a=El(e,"frozen_dimensions_preserved");a!==null&&s.push({label:"\u51BB\u7ED3\u5C3A\u5BF8\u4FDD\u6301",value:a?"\u662F":"\u5426",tone:a?"ok":"warn"});let o=Oe(e,"section_holes_found");o!==null&&s.push({label:"\u622A\u9762\u5B9E\u6D4B\u5B54\u6570",value:`${Ae(o)} \u4E2A`});let l=Oe(e,"section_worst_deviation_mm");l!==null&&s.push({label:"\u622A\u9762\u504F\u5DEE\uFF08\u6700\u5927\uFF09",value:Wn(l),tone:r!==null&&l>r?"warn":"ok"});let c=El(e,"scene_hash_matches");c!==null&&s.push({label:"\u51BB\u7ED3\u573A\u666F\u54C8\u5E0C",value:c?"\u4E00\u81F4":"\u4E0D\u4E00\u81F4",tone:c?"ok":"warn"});break}case"G08":{let a=El(e,"stl_closed");a!==null&&s.push({label:"STL \u95ED\u5408",value:a?"\u662F":"\u5426",tone:a?"ok":"warn"});let o=Oe(e,"stl_triangles");o!==null&&s.push({label:"\u4E09\u89D2\u9762",value:`${Ae(o)} \u4E2A`});let l=Oe(e,"stl_boundary_edges"),c=Oe(e,"stl_non_manifold_edges");if(l!==null||c!==null){let h=(l??0)>0||(c??0)>0;s.push({label:"\u8FB9\u754C\u8FB9/\u975E\u6D41\u5F62\u8FB9",value:`${Ae(l??0)} / ${Ae(c??0)}`,tone:h?"warn":"ok"})}let u=Oe(e,"stl_volume_delta_mm3"),d=Oe(e,"stl_volume_budget_mm3");u!==null&&s.push({label:"STEP\u2194STL \u4F53\u79EF\u5DEE",value:`${Ae(Math.abs(u))} mm\xB3${d!==null?`\uFF08\u9884\u7B97 ${Ae(d)} mm\xB3\uFF09`:""}`,tone:d!==null&&Math.abs(u)>d?"warn":"ok"});break}}return s}var Bf={synthetic_teaching_fixture:"\u6559\u5B66\u7528\u5408\u6210\u6570\u636E\uFF08\u975E\u5B9E\u6D4B\u8BBE\u5907\uFF09",user_supplied:"\u7528\u6237\u63D0\u4F9B\u7684\u6570\u636E",measured_device:"\u5B9E\u6D4B\u8BBE\u5907\u6570\u636E",vendor_datasheet:"\u5382\u5546\u6570\u636E\u624B\u518C\u6570\u636E"},zf={not_reviewed:"\u672A\u590D\u6838",awaiting_geometry_verification:"\u7B49\u5F85\u51E0\u4F55\u9A8C\u8BC1",verified:"\u5DF2\u590D\u6838"};function Wu(n){if(!n||!n.kind&&!n.source&&!n.reviewStatus)return{text:"\u672C\u6B21\u8FD0\u884C\u7684\u8F93\u5165\u4EFB\u52A1\uFF08\u672A\u9644\u6765\u6E90\u6807\u6CE8\uFF09",warn:!1};let e=n.kind?Bf[n.kind]??n.kind:"\u6765\u6E90\u672A\u6807\u6CE8",t=n.reviewStatus?zf[n.reviewStatus]??n.reviewStatus:"\u672A\u6807\u6CE8\u590D\u6838\u72B6\u6001",i=n.kind!=="measured_device"&&n.kind!=="vendor_datasheet";return{text:`${e} \xB7 ${t}`,...n.source?{hint:n.source}:{},warn:i}}function Xu(n){let e=Vf(n.device);if(e)return e;let t={center:null,rotationDeg:0,source:"unknown",verified:!1,poseSolutions:null,worstDeviationMm:null,note:"\u6CA1\u6709\u53EF\u7528\u7684\u5B9E\u6D4B\u4F4D\u59FF\uFF1AG04 \u5C1A\u672A\u7ED9\u51FA\u552F\u4E00\u89E3\uFF0C\u8BBE\u5907\u4E0E\u64CD\u4F5C\u7A7A\u95F4\u65E0\u6CD5\u5B9A\u4F4D"},i=n.report?ci(n.report)[3]:null;if(i){let r=i.measured,a=$e(r.derived_center_x_mm),o=$e(r.derived_center_y_mm),l=$e(r.pose_solutions),c=$e(r.worst_pattern_deviation_mm);if(i.status==="FAIL"&&(l===null||l===0))return{...t,poseSolutions:l,worstDeviationMm:c,note:`G04 \u5931\u8D25\uFF1A${i.reasonCode??"SENSOR_HOLE_MISMATCH"}\uFF0C\u5B54\u7EC4\u65E0\u6CD5\u89E3\u91CA\u51FA\u552F\u4E00\u4F4D\u59FF`};if(a!==null&&o!==null&&(l===null||l===1)){let u=l===1;return{center:[a,o],rotationDeg:0,source:"report_g04",verified:u,poseSolutions:l,worstDeviationMm:c,note:u?`\u5B9E\u6D4B\u4F4D\u59FF\uFF1A\u7531 G04 \u4ECE STEP \u5B9E\u9645\u5B54\u7EC4\u63A8\u5BFC\uFF08\u5B54\u7EC4\u6700\u5927\u504F\u5DEE ${c===null?"\u672A\u8BB0\u5F55":`${c.toFixed(4)}mm`}\uFF09`:"G04 \u62A5\u544A\u4E86\u5B9E\u6D4B\u5B54\u7EC4\u4E2D\u5FC3\uFF0C\u4F46\u672A\u6807\u8BB0\u552F\u4E00\u89E3\uFF1B\u6309\u5B9E\u6D4B\u5B54\u7EC4\u4E2D\u5FC3\u663E\u793A"}}if(l!==null&&l>1)return{...t,poseSolutions:l,worstDeviationMm:c,note:`G04 \u6709 ${l} \u4E2A\u89E3\uFF0C\u4F4D\u59FF\u4E0D\u552F\u4E00\uFF1B\u4E0D\u663E\u793A\u8BBE\u5907\u5305\u7EDC`}}let s=Hf(n.evidence);if(s)return{center:s.center,rotationDeg:0,source:"evidence",verified:s.verified,poseSolutions:s.solutions,worstDeviationMm:s.worst,note:s.verified?"\u5B9E\u6D4B\u4F4D\u59FF\uFF1A\u7531 STEP \u5B9E\u6D4B\u5B54\u7EC4\u63A8\u5BFC":"\u9A8C\u8BC1\u5668\u7ED9\u51FA\u4E86\u5B54\u7EC4\u4F4D\u59FF\u4F46\u72B6\u6001\u975E PASS\uFF0C\u6309\u672A\u9A8C\u8BC1\u663E\u793A"};if(Je(n.design)){let r=n.design.sensor_pose;if(Je(r)){let a=Xn(r.center),o=$e(r.rotation_deg);if(a)return{center:a,rotationDeg:o??0,source:"design_candidate",verified:!1,poseSolutions:null,worstDeviationMm:null,note:"\u5019\u9009\u4F4D\u59FF\uFF08\u6765\u81EA DesignSpec\uFF0C\u5C1A\u672A\u7531 G04 \u5B9E\u6D4B\u786E\u8BA4\uFF09"}}}return t}function Vf(n){if(!Je(n))return null;let e=Xn(n.center_xy);if(!e)return null;let t=Xe(n.source),i=n.verified===!0&&t!=="design-fallback",s=$e(n.worst_deviation_mm),r=Xe(n.warning);return{center:e,rotationDeg:$e(n.rotation_deg)??0,source:i?"evidence":"design_candidate",verified:i,poseSolutions:null,worstDeviationMm:s,note:i?`\u5B9E\u6D4B\u4F4D\u59FF\uFF1A\u7531 STEP \u5B9E\u9645\u5B54\u7EC4\u63A8\u5BFC${s===null?"":`\uFF08\u6700\u5927\u504F\u5DEE ${s.toFixed(4)}mm\uFF09`}`:r??"\u5019\u9009\u4F4D\u59FF\uFF08\u672A\u7531\u5B54\u7EC4\u5B9E\u6D4B\u786E\u8BA4\uFF09\uFF0C\u4E0D\u5F97\u4F5C\u4E3A\u901A\u8FC7\u7ED3\u679C\u5C55\u793A"}}function Hf(n){if(!Je(n))return null;let t=(Je(n.sensor_group)?n.sensor_group:null)??(Je(n.derived_pose)?n:null);if(!t)return null;let i=Je(t.derived_pose)?t.derived_pose:null,s=i?Xn(i.center_xy):null;if(!s)return null;let r=t.pose_status;return{center:s,verified:r==="PASS",solutions:r==="PASS"?1:null,worst:i?$e(i.worst_deviation_mm):null}}function qu(n,e){let t=n?ci(n)[1]:null,i=t?$e(t.measured.thickness_mm):null;if(i!==null)return{thicknessMm:i,source:"report_g02"};let s=e?.plate?.thickness??null;return s!==null?{thicknessMm:s,source:"task_frozen"}:{thicknessMm:null,source:"unknown"}}function $u(n){let e=[],t=[],i=Je(n.scene)?n.scene:null;if(!i)return t.push("\u51BB\u7ED3\u573A\u666F\u7F3A\u5931\uFF1A\u65E0\u6CD5\u6784\u9020\u56FA\u5B9A\u73AF\u5883\u5305\u7EDC"),{envelopes:e,notes:t};let s=Array.isArray(i.objects)?i.objects:[];for(let a of s){if(!Je(a))continue;let o=Xe(a.id);if(o){if(a.kind==="cylinder"){let l=Xn(a.axis_xy),c=$e(a.radius),u=Uu(a.z_range);if(!l||c===null||!u)continue;e.push({id:o,role:Xe(a.role)??"fixed_obstacle",kind:"cylinder",center:[l[0],l[1],(u[0]+u[1])/2],radius:c,height:u[1]-u[0],movable:!1,source:"frozen_scene"});continue}if(a.kind==="box_local_xy_abs_z"){let l=Fu(Array.isArray(a.local_xy_range)?a.local_xy_range[0]:null),c=Fu(Array.isArray(a.local_xy_range)?a.local_xy_range[1]:null),u=Uu(a.absolute_z_range);if(!l||!c||!u)continue;if(!n.pose.center){t.push(`\u64CD\u4F5C\u7A7A\u95F4 ${o} \u662F\u8BBE\u5907\u5C40\u90E8\u5750\u6807\uFF0C\u7F3A\u5C11\u8BBE\u5907\u4E2D\u5FC3\uFF0C\u6682\u4E0D\u663E\u793A`);continue}let[d,h]=n.pose.center;e.push({id:o,role:Xe(a.role)??"connector_access",kind:"box",center:[d+(l[0]+l[1])/2,h+(c[0]+c[1])/2,(u[0]+u[1])/2],size:[l[1]-l[0],c[1]-c[0],u[1]-u[0]],movable:!0,source:n.pose.verified?"device_pose_measured":"device_pose_candidate"})}}}let r=n.task?.sensor?.bodySize??null;if(r){let[a,o,l]=r;if(n.pose.center&&n.plateTopZ!==null){let[c,u]=n.pose.center;e.push({id:"sensor_body",role:"sensor_body",kind:"box",center:[c,u,n.plateTopZ+l/2],size:[a,o,l],movable:!0,source:n.pose.verified?"device_pose_measured":"device_pose_candidate"})}else n.pose.center?t.push("\u8BBE\u5907\u5305\u7EDC\u9700\u8981\u677F\u9876\u9AD8\u5EA6\uFF1AG02/\u4EFB\u52A1\u503C\u7F3A\u5931\uFF0C\u4E0D\u663E\u793A\u8BBE\u5907"):t.push("\u8BBE\u5907\u5305\u7EDC\u9700\u8981\u5B9E\u6D4B\u4F4D\u59FF(G04)\uFF1A\u4F4D\u59FF\u672A\u77E5\uFF0C\u4E0D\u663E\u793A\u8BBE\u5907")}else t.push("\u4EFB\u52A1\u7F3A\u5C11 sensor.body_size\uFF1A\u4E0D\u663E\u793A\u8BBE\u5907\u5305\u7EDC");return{envelopes:e,notes:t}}function Xr(n){if(!Je(n))return null;let e=wl(n.overall);return e===null?null:{reportId:Xe(n.report_id)??"(\u672A\u547D\u540D\u62A5\u544A)",overall:e,taskRevision:$e(n.task_revision),createdAt:Xe(n.created_at)??Xe(n.report_created_at),validatorVersion:Xe(n.validator_version),candidateId:Xe(n.candidate_id),stepSha256:null,checks:Array.isArray(n.checks)?Gr({overall:e,checks:n.checks,report_id:Xe(n.report_id)??"summary"})?.checks??[]:[],errors:[],raw:n}}function Pl(n){if(!Je(n))return null;let e=Je(n.plate)?n.plate:void 0;return{...e?{plate:e}:{},sensorCenterXy:Xn(n.sensor_center_xy),sensorRotationDeg:$e(n.sensor_rotation_deg),sensorHoleCenters:Array.isArray(n.sensor_hole_centers_xy)?n.sensor_hole_centers_xy.flatMap(t=>{let i=Xn(t);return i?[i]:[]}):void 0}}function li(n){return Number.isInteger(n)?String(n):n.toFixed(3).replace(/0+$/,"").replace(/\.$/,"")}function Nl(n,e){if(!n||!e)return[];let t=[],i=["width","height","thickness"],s={width:"\u677F\u5BBD",height:"\u677F\u9AD8",thickness:"\u677F\u539A"};for(let d of i){let h=$e(n.plate?.[d]),p=$e(e.plate?.[d]);h!==null&&p!==null&&Math.abs(h-p)>1e-9&&t.push(`${s[d]} ${li(h)} \u2192 ${li(p)} mm`)}let[r,a]=n.sensorCenterXy??[null,null],[o,l]=e.sensorCenterXy??[null,null];r!==null&&a!==null&&o!==null&&l!==null&&(Math.abs(r-o)>1e-9||Math.abs(a-l)>1e-9)&&t.push(`\u8BBE\u5907\u4E2D\u5FC3 (${li(r)}, ${li(a)}) \u2192 (${li(o)}, ${li(l)}) mm`);let c=n.sensorRotationDeg??null,u=e.sensorRotationDeg??null;return c!==null&&u!==null&&Math.abs(c-u)>1e-9&&t.push(`\u8BBE\u5907\u65CB\u8F6C ${li(c)}\xB0 \u2192 ${li(u)}\xB0`),t}function ku(n){if(!Je(n))return null;let e=Pl(n),t=Je(n.sensor_pose)?n.sensor_pose:null,i=t?Xn(t.center):e?.sensorCenterXy??null,s=t?$e(t.rotation_deg):e?.sensorRotationDeg??null,r=Je(n.plate)?n.plate:e?.plate;return r||i||s!==null?{...r?{plate:r}:{},sensorCenterXy:i,sensorRotationDeg:s}:e}var Bu=n=>Fn.map((e,t)=>{let i=ci(n)[t];return i?i.status:"MISSING"}),zu=n=>{let e=ci(n)[Fn.indexOf("G02")];return e?e.measured:{}};function Yu(n){let{baseline:e,current:t}=n,i=[];if(!e)return{status:"single",baseline:null,current:t,designLines:[],plateRows:[],checkRows:[],failingGained:[],failingResolved:[],notes:["\u672A\u9009\u62E9\u5BF9\u6BD4\u57FA\u51C6\uFF1A\u672C\u6B21\u8FD0\u884C\u5185\u7684\u7248\u672C\u5BF9\u6BD4\u9700\u8981\u4E00\u4E2A\u57FA\u51C6\u7248\u672C\u3002"]};if(e.candidateId===t.candidateId)return{status:"single",baseline:e,current:t,designLines:[],plateRows:[],checkRows:[],failingGained:[],failingResolved:[],notes:["\u5BF9\u6BD4\u57FA\u51C6\u4E0E\u5F53\u524D\u7248\u672C\u76F8\u540C\uFF1B\u8BF7\u9009\u62E9\u53E6\u4E00\u4E2A\u7248\u672C\u4F5C\u4E3A\u57FA\u51C6\u3002"]};let s=ku(e.design),r=ku(t.design),a=s&&r?Nl(s,r):[];(!s||!r)&&i.push(`\u8BBE\u8BA1\u6587\u6863\u7F3A\u5931\u6216\u4E0D\u53EF\u89E3\u6790\uFF08${[s?null:"\u57FA\u51C6",r?null:"\u5F53\u524D"].filter(Boolean).join("\u3001")}\uFF09\uFF0C\u65E0\u6CD5\u7ED9\u51FA\u8BBE\u8BA1\u5DEE\u5F02\uFF1B\u4EE5\u4E0B\u4EC5\u5C55\u793A\u5404\u81EA\u62A5\u544A\u7684\u5B9E\u6D4B\u3002`);let o=[{axis:"width",label:"\u677F\u5BBD",key:"width_mm"},{axis:"height",label:"\u677F\u9AD8",key:"height_mm"},{axis:"thickness",label:"\u677F\u539A",key:"thickness_mm"}],l=zu(e.report),c=zu(t.report),u=o.map(({axis:M,label:C,key:S})=>({axis:M,label:C,baselineMm:$e(l[S]),currentMm:$e(c[S])})),d=Bu(e.report),h=Bu(t.report),p=Fn.map((M,C)=>({id:M,baseline:d[C]??"MISSING",current:h[C]??"MISSING",changed:d[C]!==h[C]})),m=[],y=[];if(e.report&&t.report){let M=new Set(Hr(e.report)),C=new Set(Hr(t.report));m=[...C].filter(S=>!M.has(S)),y=[...M].filter(S=>!C.has(S))}else i.push("\u4E00\u4FA7\u7F3A\u5C11\u62A5\u544A\uFF1A\u65E0\u6CD5\u7ED9\u51FA\u5931\u8D25\u5BF9\u8C61\u7684\u53D8\u5316\uFF0C\u53EA\u80FD\u5C55\u793A\u5DF2\u6709\u7684\u4E00\u4FA7\u3002");let g="ready",f=[];return e.report?e.freshness.state!=="current"&&f.push(`\u57FA\u51C6 ${e.candidateId} \u62A5\u544A${e.freshness.label}`):f.push(`\u57FA\u51C6 ${e.candidateId} \u6CA1\u6709\u62A5\u544A`),t.report?t.freshness.state!=="current"&&f.push(`\u5F53\u524D ${t.candidateId} \u62A5\u544A${t.freshness.label}`):f.push(`\u5F53\u524D ${t.candidateId} \u6CA1\u6709\u62A5\u544A`),f.length>0&&(g="unverified",i.push(`\u672A\u9A8C\u8BC1\uFF1A${f.join("\uFF1B")}\u2014\u2014\u672C\u5BF9\u6BD4\u4E0D\u4EE3\u8868\u5F53\u524D\u8981\u6C42\u4E0B\u7684\u7ED3\u679C\u3002`)),{status:g,baseline:e,current:t,designLines:a,plateRows:u,checkRows:p,failingGained:m,failingResolved:y,notes:i}}var Ws="fitplate.run",Ni="fitplate.scene",ji="fitplate.artifact",ju=64*1024,Gf=32*1024*1024,He=class extends Error{code;detail;constructor(e,t,i=""){super(t),this.name="AdapterError",this.code=e,this.detail=i}};function Gt(n){return n!==null&&typeof n=="object"&&!Array.isArray(n)}function rt(n){return typeof n=="string"&&n.length>0?n:null}function Pi(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function Qi(n,e){let t=e instanceof Error?e.message:String(e),i=t.toLowerCase();return i.includes("service is unavailable")||i.includes("not authorized")?new He("SERVICE_UNAVAILABLE",`\u670D\u52A1 ${n} \u5F53\u524D\u4E0D\u53EF\u7528\uFF1A\u63D2\u4EF6\u63CF\u8FF0\u672A\u58F0\u660E\u8BE5\u670D\u52A1\u3001\u5BBF\u4E3B\u672A\u6388\u6743\uFF0C\u6216\u540E\u7AEF\u884C\u672A\u5C31\u7EEA`,t):i.includes("active session")||i.includes("session unavailable")?new He("NO_SESSION",`\u670D\u52A1 ${n} \u9700\u8981\u5F53\u524D\u4F1A\u8BDD\uFF1B\u8BF7\u5148\u5728 AGH \u4E2D\u9009\u62E9\u6216\u521B\u5EFA\u4F1A\u8BDD`,t):i.includes("failed to fetch")||i.includes("network")||i.includes("timeout")?new He("TRANSPORT",`\u8C03\u7528 ${n} \u5931\u8D25\uFF1A\u4E0E\u5BBF\u4E3B\u7684\u8FDE\u63A5\u4E2D\u65AD\u6216\u8D85\u65F6`,t):new He("REFUSED",`\u8C03\u7528 ${n} \u88AB\u62D2\u7EDD\uFF1A${t}`,t)}function Qu(){let n=0;return{get token(){return n},next(){return n+=1,n},isCurrent(e){return e===n}}}var Wf=[{artifactId:"model.step",name:"model.step",kind:"step",bytes:null,sha256:null,mime:"model/step"},{artifactId:"model.stl",name:"model.stl",kind:"stl",bytes:null,sha256:null,mime:"model/stl"},{artifactId:"report.json",name:"report.json",kind:"report",bytes:null,sha256:null,mime:"application/json"},{artifactId:"evidence.json",name:"evidence.json",kind:"evidence",bytes:null,sha256:null,mime:"application/json"}],Xf=new Set(["COMPLETED","CANCELLED","ERROR","BUDGET_EXHAUSTED","NEEDS_INPUT"]),qf=new Set(["DRAFT","READY","BUILDING","BUILT","VALIDATING","REVISING","EXPORTING","FAILED_CONSTRAINTS","PASSED","RUNNING"]);function eh(n){if(!n)return"unknown";let e=n.toUpperCase();return Xf.has(e)?"terminal":qf.has(e)?"active":"unknown"}function Zu(n){let e=n.toLowerCase();return e.endsWith(".step")||e.endsWith(".stp")?"step":e.endsWith(".stl")?"stl":e.includes("report")?"report":e.includes("evidence")?"evidence":e.includes("preview_mesh")?"mesh":e.includes("preview")?"preview":"other"}function Ku(n){if(typeof n=="string"&&n.length>0)return{artifactId:n,name:n,kind:Zu(n),bytes:null,sha256:null,mime:null};if(!Gt(n))return null;let e=rt(n.artifact_id)??rt(n.id)??rt(n.name),t=rt(n.name)??e;return!e||!t?null:{artifactId:e,name:t,kind:Zu(t),bytes:Pi(n.bytes)??Pi(n.size),sha256:Ji(n.sha256)?Rt(n.sha256):null,mime:rt(n.mime)}}function $f(n){if(!Gt(n))return null;let e=rt(n.candidate_id)??rt(n.id);if(!zr(e))return null;let t=Gt(n.report)?n.report:Gt(n.report_summary)?n.report_summary:null,i=t?Gr(t)??Xr(t):Xr(n),s=Array.isArray(n.artifacts)?n.artifacts.flatMap(r=>{let a=Ku(r);return a?[a]:[]}):Array.isArray(n.files)?n.files.flatMap(r=>{let a=Ku(r);return a?[a]:[]}):[];return{candidateId:e,createdAt:rt(n.created_at),stepSha256:Rt(n.step_sha256)||null,stlSha256:Rt(n.stl_sha256)||null,status:rt(n.status),report:i,reportIsSummary:i!==null&&i.checks.length===0,reportFileSha256:Rt(n.report_file_sha256)||null,reportSha256:Rt(n.report_sha256??t?.report_sha256)||null,designSummary:Pl(n.design_summary),changeSummary:rt(n.change_summary)??rt(n.rationale),artifacts:Array.isArray(n.artifacts)||Array.isArray(n.files)?s:Wf.map(r=>({...r})),parentCandidateId:rt(n.parent_candidate_id)??rt(n.parent),raw:n}}function Dl(n,e){let t=rt(e)??"UNKNOWN";return n===Ws&&(t==="NO_RUN_FOR_SESSION"||t==="RUN_NOT_AVAILABLE_FOR_SESSION")?new He("NO_RUN",t==="NO_RUN_FOR_SESSION"?"\u5F53\u524D\u4F1A\u8BDD\u8FD8\u6CA1\u6709 FitPlate \u8FD0\u884C\u8BB0\u5F55\uFF08\u53EF\u7528 fitplate_load_task \u5EFA\u7ACB\u4E00\u6B21\u8FD0\u884C\uFF09":"\u8BE5\u8FD0\u884C\u4E0D\u5B58\u5728\uFF0C\u6216\u4E0D\u5C5E\u4E8E\u5F53\u524D\u4F1A\u8BDD\uFF08\u4E00\u81F4\u6027\u8FC7\u6EE4\u62D2\u7EDD\u663E\u793A\uFF09",t):n===Ni||n===ji?t==="CANDIDATE_NOT_FOUND"?new He("NOT_FOUND",`\u8BE5\u5019\u7248\u672C\u4E0D\u5728\u8FD0\u884C\u7684\u7248\u672C\u5217\u8868\u4E2D\uFF1A${t}`,t):t==="RUN_NOT_AVAILABLE_FOR_SESSION"?new He("NOT_FOUND","\u8BE5\u8FD0\u884C\u4E0D\u5B58\u5728\uFF0C\u6216\u4E0D\u5C5E\u4E8E\u5F53\u524D\u4F1A\u8BDD\uFF08\u4E00\u81F4\u6027\u8FC7\u6EE4\u62D2\u7EDD\u663E\u793A\uFF09",t):t==="UNKNOWN_ARTIFACT"?new He("NOT_FOUND","\u8BE5\u4EA7\u7269\u672A\u5728\u8FD0\u884C\u6E05\u5355\u4E2D\u767B\u8BB0\uFF0C\u62D2\u7EDD\u8BFB\u53D6",t):new He("NOT_FOUND",`${n} \u62D2\u7EDD\u8BF7\u6C42\uFF1A${t}`,t):new He("NOT_FOUND",`${n} \u62D2\u7EDD\u8BF7\u6C42\uFF1A${t}`,t)}function th(n,e){if(!Gt(n))throw new He("SHAPE","fitplate.run \u8FD4\u56DE\u7684\u4E0D\u662F\u5BF9\u8C61");if(n.found===!1)throw Dl(Ws,n.reason);let t=rt(n.run_id)??rt(n.runId);if(!t)throw new He("SHAPE","fitplate.run \u8FD4\u56DE\u7F3A\u5C11 run_id");if(e.runId&&t!==e.runId)throw new He("IDENTITY_MISMATCH",`fitplate.run \u8FD4\u56DE\u7684\u662F run ${t}\uFF0C\u800C\u8BF7\u6C42\u7684\u662F ${e.runId}`);let i=rt(n.session_key)??e.sessionKey;if(n.session_key!==void 0&&n.session_key!==e.sessionKey)throw new He("IDENTITY_MISMATCH",`fitplate.run \u8FD4\u56DE\u7684 session_key \u4E0E\u5F53\u524D\u4F1A\u8BDD\u4E0D\u4E00\u81F4\uFF08\u8FD4\u56DE ${String(n.session_key)}\uFF09`);let r=(Array.isArray(n.versions)?n.versions:Array.isArray(n.candidates)?n.candidates:[]).flatMap(l=>{let c=$f(l);return c?[c]:[]}),a=rt(n.latest_candidate_id)??rt(n.latest),o=Array.isArray(n.exports)?n.exports:[];return{sessionKey:i,runId:t,state:(rt(n.state)??"UNKNOWN").toUpperCase(),taskRevision:Pi(n.task_revision),task:Al(n.task??n.task_summary??null),versions:r,latestCandidateId:a&&zr(a)?a:r.at(-1)?.candidateId??null,updatedAt:rt(n.updated_at),note:rt(n.note)??rt(n.reason),exports:o.flatMap(l=>{if(!Gt(l))return[];let c=rt(l.candidate_id);return c?[{candidateId:c,reportId:rt(l.report_id),stepSha256:Rt(l.step_sha256)||null,reportFileSha256:Rt(l.report_file_sha256)||null,reportSha256:Rt(l.report_sha256)||null,exportDir:rt(l.export_dir),failed:l.failed===!0,exportedAt:rt(l.exported_at)}]:[]}),raw:n}}function Yf(n){return Gt(n.mesh)?n.mesh:Gt(n.preview_mesh)?n.preview_mesh:Array.isArray(n.vertices)&&Array.isArray(n.indices)?n:null}function Zf(n){let e=Gt(n.mesh_blocked)?n.mesh_blocked:null;return e?{reason:rt(e.reason)??"MESH_UNAVAILABLE",message:rt(e.message)??"the service did not return a mesh for this candidate",artifactId:rt(e.artifact_id),totalBytes:Pi(e.total_bytes)}:null}function Ll(n,e){if(!Gt(n))throw new He("SHAPE","fitplate.scene \u8FD4\u56DE\u7684\u4E0D\u662F\u5BF9\u8C61");if(n.found===!1)throw Dl(Ni,n.reason);let t=rt(n.run_id);if(t&&t!==e.runId)throw new He("IDENTITY_MISMATCH",`fitplate.scene \u8FD4\u56DE run ${t}\uFF0C\u800C\u8BF7\u6C42\u7684\u662F ${e.runId}`);let i=rt(n.candidate_id);if(i!==null&&i!==e.candidateId)throw new He("IDENTITY_MISMATCH",`fitplate.scene \u8FD4\u56DE candidate ${String(i)}\uFF0C\u800C\u8BF7\u6C42\u7684\u662F ${e.candidateId}`);let s=Gt(n.binding)?n.binding:null,r=Yf(n),a=Zf(n),o=s?rt(s.candidate_id):null;if(o!==null&&o!==e.candidateId)throw new He("IDENTITY_MISMATCH",`fitplate.scene \u7684 binding \u6307\u5411\u5019\u9009 ${o}\uFF0C\u800C\u8BF7\u6C42\u7684\u662F ${e.candidateId}`);let l=Rt(s?.step_sha256)||(Gt(r)?Rt(r.step_sha256):"")||Rt(n.step_sha256);if(r!==null&&Gt(r)){let d=rt(r.candidate_id);if(d!==null&&d!==e.candidateId)throw new He("IDENTITY_MISMATCH",`\u7F51\u683C\u5C5E\u4E8E\u5019\u9009 ${d}\uFF0C\u800C\u8BF7\u6C42\u7684\u662F ${e.candidateId}`)}if(!l)throw new He("IDENTITY_MISMATCH","fitplate.scene \u54CD\u5E94\u6CA1\u6709\u53EF\u7528\u7684 step_sha256\uFF08binding \u4E0E mesh \u90FD\u7F3A\u5931\uFF09\uFF0C\u65E0\u6CD5\u4E0E\u4EA7\u7269\u7ED1\u5B9A");if(e.stepSha256&&Rt(e.stepSha256)!==l)throw new He("IDENTITY_MISMATCH",`fitplate.scene \u7ED1\u5B9A STEP ${l.slice(0,12)}\u2026\uFF0C\u4E0E\u8FD0\u884C\u8BB0\u5F55\u7684 ${e.stepSha256.slice(0,12)}\u2026 \u4E0D\u4E00\u81F4`);let c=Gr(n.report??n.report_summary)??Xr(n.report??n.report_summary),u=c&&Gt(c.raw)?rt(c.raw.report_id):null;if(e.reportId!=null&&u!==null&&u!==e.reportId)throw new He("IDENTITY_MISMATCH","fitplate.scene \u7684\u62A5\u544A\u6B63\u6587\u4E0E\u5F53\u524D report_id \u4E0D\u4E00\u81F4\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");for(let[d,h,p]of[[e.reportId,s?.report_id??c?.reportId,"report_id"],[e.reportFileSha256,Rt(s?.report_file_sha256)||null,"report_file_sha256"],[e.reportSha256,Rt(s?.report_sha256)||null,"report_sha256"]])if(d!=null&&d!==h&&!(p==="report_id"&&h==null))throw new He("IDENTITY_MISMATCH",`fitplate.scene \u7684 ${p} \u4E0E\u5F53\u524D\u8FD0\u884C\u8BB0\u5F55\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5`);return{identity:{runId:e.runId,candidateId:e.candidateId,stepSha256:l},mesh:Gt(r)?r:null,meshBlocked:a,task:Al(n.task??n.task_summary??null),scene:n.scene??null,report:c,evidence:n.evidence??null,design:n.design??null,device:n.device??null,binding:s,raw:n}}function Kf(n){let e=globalThis.atob(n),t=new Uint8Array(e.length);for(let i=0;i<e.length;i+=1)t[i]=e.charCodeAt(i);return t}function Jf(n,e){if(!Gt(n))throw new He("SHAPE","fitplate.artifact \u8FD4\u56DE\u7684\u4E0D\u662F\u5BF9\u8C61");if(n.found===!1)throw Dl(ji,n.reason);let t=rt(n.artifact_id)??rt(n.id);if(t&&t!==e.artifactId)throw new He("IDENTITY_MISMATCH",`fitplate.artifact \u8FD4\u56DE\u4EA7\u7269 ${t}\uFF0C\u800C\u8BF7\u6C42\u7684\u662F ${e.artifactId}`);let i=Pi(n.offset);if(i===null||i!==e.offset)throw new He("CHUNK",`fitplate.artifact \u8FD4\u56DE\u7684 offset=${String(n.offset)}\uFF0C\u671F\u671B ${e.offset}\uFF08\u5206\u5757\u5FC5\u987B\u987A\u5E8F\u8BFB\u53D6\uFF09`);let s=typeof n.chunk_base64=="string"?n.chunk_base64:typeof n.data=="string"?n.data:null;if(s===null)throw new He("SHAPE","fitplate.artifact \u7F3A\u5C11 chunk_base64/data \u5B57\u6BB5");let r=n.encoding==="utf8"?"utf8":"base64",a;if(r==="base64")try{a=Kf(s)}catch(l){throw new He("CHUNK","artifact base64 \u5206\u5757\u89E3\u7801\u5931\u8D25",String(l))}else a=new TextEncoder().encode(s);if(a.byteLength>ju)throw new He("CHUNK",`artifact \u5206\u5757 ${a.byteLength} \u5B57\u8282\u8D85\u8FC7 64KiB \u4E0A\u9650`,"\u670D\u52A1\u7AEF\u5FC5\u987B\u6309 <=64KiB \u5206\u5757");let o=Pi(n.bytes);if(o!==null&&o!==a.byteLength)throw new He("CHUNK",`artifact \u5206\u5757\u58F0\u660E ${o} \u5B57\u8282\uFF0C\u5B9E\u9645\u89E3\u7801 ${a.byteLength} \u5B57\u8282\uFF0C\u62D2\u7EDD\u4F7F\u7528`);return{offset:i,bytes:a,eof:n.eof===!0,totalBytes:Pi(n.total_bytes),sha256:Ji(n.sha256)?Rt(n.sha256):null,chunkSha256:Ji(n.chunk_sha256)?Rt(n.chunk_sha256):null,encoding:r}}async function Ju(n){let e=await globalThis.crypto.subtle.digest("SHA-256",n);return[...new Uint8Array(e)].map(t=>t.toString(16).padStart(2,"0")).join("")}async function nh(n,e){let t=e.maxBytes??Gf,i=[],s=0,r=0,a=0,o=null,l=null;for(;;){let p;try{p=await n(ji,{session_key:e.sessionKey,run_id:e.runId,candidate_id:e.candidateId,artifact_id:e.artifactId,offset:s,limit:ju})}catch(y){throw Qi(ji,y)}let m=Jf(p,{offset:s,artifactId:e.artifactId});if(a+=1,m.chunkSha256){let y=await Ju(m.bytes);if(y!==m.chunkSha256)throw new He("HASH_MISMATCH",`artifact \u5206\u5757\u6821\u9A8C\u5931\u8D25\uFF08offset ${s}\uFF09\uFF1A\u5B9E\u8BFB ${y.slice(0,12)}\u2026\uFF0C\u58F0\u660E ${m.chunkSha256.slice(0,12)}\u2026`)}if(m.sha256&&(l=m.sha256),m.totalBytes!==null&&(o=m.totalBytes),m.bytes.byteLength===0&&!m.eof)throw new He("CHUNK","artifact \u670D\u52A1\u8FD4\u56DE\u7A7A\u5757\u4F46\u6CA1\u6709 eof\uFF0C\u62D2\u7EDD\u65E0\u9650\u8BFB\u53D6",`offset=${s}`);if(i.push(m.bytes),r+=m.bytes.byteLength,r>t)throw new He("TOO_LARGE",`artifact \u8D85\u8FC7\u524D\u7AEF\u4E0A\u9650 ${(t/1024/1024).toFixed(0)}MiB\uFF0C\u5DF2\u4E2D\u6B62`);if(s+=m.bytes.byteLength,e.onProgress?.(r,o),m.eof)break}let c=new Uint8Array(r),u=0;for(let p of i)c.set(p,u),u+=p.byteLength;if(o!==null&&o!==r)throw new He("CHUNK",`artifact \u5B9E\u9645\u8BFB\u53D6 ${r} \u5B57\u8282\uFF0C\u670D\u52A1\u58F0\u660E ${o} \u5B57\u8282\uFF0C\u8BFB\u53D6\u4E0D\u5B8C\u6574`);let d=await Ju(c),h=Rt(e.expectedSha256);if(h&&d!==h)throw new He("HASH_MISMATCH",`artifact \u6821\u9A8C\u5931\u8D25\uFF1A\u5B9E\u8BFB ${d.slice(0,12)}\u2026\uFF0C\u767B\u8BB0 ${h.slice(0,12)}\u2026\uFF0C\u62D2\u7EDD\u4E0B\u8F7D`);if(l&&d!==l)throw new He("HASH_MISMATCH",`artifact \u6821\u9A8C\u5931\u8D25\uFF1A\u5B9E\u8BFB ${d.slice(0,12)}\u2026\uFF0C\u670D\u52A1\u58F0\u660E ${l.slice(0,12)}\u2026\uFF0C\u62D2\u7EDD\u4E0B\u8F7D`);return{artifactId:e.artifactId,bytes:c,sha256:d,chunks:a,totalBytes:o}}var ih=Object.freeze({phase:"no-session",notice:null,sessionKey:void 0,run:null,versions:[],selectedCandidateId:null,selectedVersion:null,scene:null,sceneError:null,poseChangeText:null,busy:!1,autoRefresh:!0,polling:!1,lastUpdatedAt:null,download:null,downloadError:null,compareBaselineId:null,baselineScene:null,baselineNotice:null,baselineBusy:!1,comparePoseText:null}),Ul=(n,e)=>JSON.stringify([n.runId,n.taskRevision,e.candidateId,e.stepSha256,e.report?.reportId??null,e.report?.overall??null,e.report?.createdAt??null,e.report?.validatorVersion??null,e.reportFileSha256,e.reportSha256]);function sh(n){return{kind:n.code==="SERVICE_UNAVAILABLE"||n.code==="NO_SESSION"?"info":"error",title:n.message,detail:n.detail||void 0,code:n.code}}var qr=(n,e)=>JSON.stringify([n.runId,n.taskRevision,e.candidateId,e.stepSha256,e.status,e.parentCandidateId,e.report?.reportId??null,e.report?.overall??null,e.report?.createdAt??null,e.report?.validatorVersion??null,e.reportIsSummary,e.reportFileSha256,e.reportSha256]),$r=class{snapshot=ih;listeners=new Set;gate=Qu();call;intervalMs;now;setTimer;clearTimer;projectionThrottleMs;sessionKey;poseHistory=new Map;lastDisplayedPose=null;runId=null;timer=null;disposed=!1;inFlight=null;inFlightToken=-1;sceneToken=0;runRequestToken=0;projectionTimer=null;lastProjectionRefresh=0;compareToken=0;baselineFingerprint=null;liveRun=null;constructor(e){this.call=e.call,this.intervalMs=e.intervalMs??1e3,this.now=e.now??(()=>Date.now()),this.setTimer=e.setTimer??((t,i)=>globalThis.setTimeout(t,i)),this.clearTimer=e.clearTimer??(t=>globalThis.clearTimeout(t)),this.projectionThrottleMs=e.projectionThrottleMs??400}subscribe=e=>(this.listeners.add(e),()=>{this.listeners.delete(e)});getSnapshot=()=>this.snapshot;update(e){if(!this.disposed){this.snapshot={...this.snapshot,...e};for(let t of[...this.listeners])t()}}setSession(e){if(!this.disposed&&e!==this.sessionKey){if(this.gate.next(),this.sessionKey=e,this.runId=null,this.poseHistory.clear(),this.lastDisplayedPose=null,this.sceneToken+=1,this.compareToken+=1,this.baselineFingerprint=null,this.liveRun=null,this.stopPolling(),!e){this.update({...ih,autoRefresh:this.snapshot.autoRefresh});return}this.update({phase:"loading",notice:null,sessionKey:e,run:null,versions:[],selectedCandidateId:null,selectedVersion:null,scene:null,sceneError:null,busy:!0,download:null,downloadError:null,lastUpdatedAt:null,polling:!1,compareBaselineId:null,baselineScene:null,baselineNotice:null,baselineBusy:!1,comparePoseText:null}),this.refresh({reason:"session"})}}dispose(){this.disposed=!0,this.gate.next(),this.compareToken+=1,this.stopPolling(),this.projectionTimer!==null&&(this.clearTimer(this.projectionTimer),this.projectionTimer=null),this.listeners.clear()}setAutoRefresh(e){this.disposed||(this.update({autoRefresh:e}),e?this.sessionKey&&this.scheduleNext():this.stopPolling())}scheduleNext(){if(!(this.disposed||this.timer!==null||!this.snapshot.autoRefresh)){if(this.snapshot.run&&eh(this.snapshot.run.state)==="terminal"){this.update({polling:!1});return}this.update({polling:!0}),this.timer=this.setTimer(()=>{this.timer=null,this.refresh({reason:"poll"}).then(()=>this.scheduleNext())},this.intervalMs)}}stopPolling(){this.timer!==null&&(this.clearTimer(this.timer),this.timer=null),this.snapshot.polling&&this.update({polling:!1})}notifyProjection(){if(this.disposed||!this.sessionKey)return;let e=this.now()-this.lastProjectionRefresh;if(e>=this.projectionThrottleMs){this.lastProjectionRefresh=this.now(),this.refresh({reason:"projection"});return}this.projectionTimer===null&&(this.projectionTimer=this.setTimer(()=>{this.projectionTimer=null,this.lastProjectionRefresh=this.now(),this.refresh({reason:"projection"})},this.projectionThrottleMs-e))}selectCandidate(e){this.disposed||e===this.snapshot.selectedCandidateId||(this.update({selectedCandidateId:e,comparePoseText:null}),this.refresh({reason:"selection",forceScene:!0}))}async refresh(e={}){if(this.disposed)return;let t=this.sessionKey;if(!t){this.update({phase:"no-session",busy:!1});return}let i=this.snapshot.run,s=this.snapshot.compareBaselineId;if(i&&s!==null&&this.snapshot.baselineScene===null&&!this.snapshot.baselineBusy&&(e.manual===!0||e.forceScene===!0)){let o=i.versions.find(l=>l.candidateId===s);if(o){let l=qr(i,o);this.compareToken+=1,this.baselineFingerprint=l,this.update({baselineBusy:!0}),this.loadBaselineScene(s,i.runId,l,this.compareToken,this.gate.token)}}if(this.inFlight&&this.inFlightToken===this.gate.token&&e.forceScene!==!0){await this.inFlight;return}let r=this.gate.token,a=this.runRefresh(t,r,e);this.inFlight=a,this.inFlightToken=r;try{await a}finally{this.inFlight===a&&(this.inFlight=null,this.inFlightToken=-1)}}async runRefresh(e,t,i){this.update({busy:!0});let s=++this.runRequestToken,r=await this.loadRun(e,t,i,s);if(!r)return;let a=this.pickVersion(r);if(!a){this.update({phase:"empty",run:r,versions:[],selectedCandidateId:null,selectedVersion:null,scene:null,notice:{kind:"info",title:`\u8FD0\u884C ${r.runId} \u5C1A\u65E0\u5019\u9009\u7248\u672C`,detail:"\u7B49\u5F85\u6A21\u578B\u8C03\u7528 fitplate_build_candidate \u540E\u5237\u65B0\u3002"},busy:!1,lastUpdatedAt:this.now()});return}let o=this.buildVersionRows(r);this.update({phase:"ready",run:r,versions:o,selectedCandidateId:a.candidateId,selectedVersion:a,notice:r.note?{kind:"info",title:r.note}:this.snapshot.notice?.kind==="error"?null:this.snapshot.notice,busy:!1,lastUpdatedAt:this.now()}),await this.loadScene(r,a,t,i.forceScene===!0),!(!this.isCurrent(t)||s!==this.runRequestToken)&&(this.update({poseChangeText:this.describePoseChange(a)}),this.snapshot.autoRefresh?this.scheduleNext():this.stopPolling())}describePoseChange(e){let t=this.poseHistory.get(e.candidateId),i=this.lastDisplayedPose;if(!t)return null;if(!i||i.candidateId===e.candidateId)return this.lastDisplayedPose={candidateId:e.candidateId,center:t},null;let[s,r]=i.center,[a,o]=t;this.lastDisplayedPose={candidateId:e.candidateId,center:t};let l=a-s,c=o-r;if(Math.abs(l)<1e-6&&Math.abs(c)<1e-6)return null;let u=d=>Number.isInteger(d)?String(d):d.toFixed(3);return`\u4E0E\u4E0A\u4E00\u4E2A\u663E\u793A\u7248\u672C ${i.candidateId} \u76F8\u6BD4\uFF0C\u8BBE\u5907\u5B9E\u6D4B\u4E2D\u5FC3 (${u(s)}, ${u(r)}) \u2192 (${u(a)}, ${u(o)}) mm\uFF08G04 \u5B9E\u6D4B\u4F4D\u59FF\uFF1B\u0394=(${u(l)}, ${u(c)})\uFF09`}async loadRun(e,t,i,s){try{let r=await this.call(Ws,{session_key:e});if(!this.isCurrent(t)||s!==this.runRequestToken)return null;let a=th(r,{sessionKey:e});return this.liveRun=a,this.runId!==null&&this.runId!==a.runId&&this.resetCompare("\u8FD0\u884C\u5DF2\u5207\u6362\uFF1A\u7248\u672C\u5BF9\u6BD4\u5DF2\u91CD\u7F6E\u3002"),this.runId=a.runId,this.revalidateCompareBaseline(a),a}catch(r){if(!this.isCurrent(t)||s!==this.runRequestToken)return null;let a=r instanceof He?r:Qi(Ws,r),o=a.code==="SERVICE_UNAVAILABLE"||a.code==="NO_SESSION"||a.code==="NO_RUN";return this.update({phase:o?"empty":"error",run:null,versions:[],selectedCandidateId:null,selectedVersion:null,scene:null,notice:{...sh(a),kind:o?"info":"error",title:a.message},busy:!1,lastUpdatedAt:this.now()}),i.reason!=="poll"&&this.stopPolling(),null}}pickVersion(e){if(e.versions.length===0)return null;let t=this.snapshot.selectedCandidateId;if(t){let i=e.versions.find(s=>s.candidateId===t);if(i)return i}if(e.latestCandidateId){let i=e.versions.find(s=>s.candidateId===e.latestCandidateId);if(i)return i}return e.versions.at(-1)??null}buildVersionRows(e){return e.versions.map((t,i)=>{let s=t.report??null,r=i>0?e.versions[i-1]:null,a=[];return t.changeSummary&&a.push(t.changeSummary),r&&a.push(...Nl(r.designSummary,t.designSummary)),{version:t,report:s,freshness:Cl(s,e.taskRevision,t.stepSha256,t.candidateId),changeLines:a}})}isCurrent(e){return!this.disposed&&this.gate.isCurrent(e)}async loadScene(e,t,i,s){let r=this.snapshot.scene,a=Ul(e,t);if(r!==null&&r.identity.runId===e.runId&&r.identity.candidateId===t.candidateId&&(!t.stepSha256||r.identity.stepSha256===t.stepSha256)&&r.reportFingerprint===a&&!s)return;let l=++this.sceneToken;this.update({scene:null,sceneError:null});let c=()=>{let u=this.snapshot.run,d=u?.versions.find(h=>h.candidateId===t.candidateId);return this.isCurrent(i)&&l===this.sceneToken&&this.snapshot.selectedCandidateId===t.candidateId&&u!==null&&d!==void 0&&Ul(u,d)===a};try{let u=await this.call(Ni,{session_key:this.sessionKey,run_id:e.runId,candidate_id:t.candidateId});if(!c())return;let d=Ll(u,{runId:e.runId,candidateId:t.candidateId,stepSha256:t.stepSha256,reportId:t.report?.reportId,reportFileSha256:t.reportFileSha256,reportSha256:t.reportSha256});this.update({scene:this.buildSceneState(d,t,e),sceneError:null}),this.refreshComparePose()}catch(u){if(!c())return;let d=u instanceof He?u:u instanceof Lt?new He("SHAPE",`\u7F51\u683C\u88AB\u62D2\u7EDD\uFF1A${u.message}`,u.detail):Qi(Ni,u);this.update({scene:null,sceneError:{kind:"error",title:d.message,detail:d.detail||void 0,code:d.code}})}}buildSceneState(e,t,i){let s=e.report??t.report,r=e.report?"scene":t.report?"run-summary":"none",a=e.binding?.verified===!1?{state:"unverified-metadata",label:"\u4EA7\u7269\u5B8C\u6574\u6027\u672A\u6838\u5B9E\uFF0C\u4E0D\u80FD\u4F5C\u4E3A\u5F53\u524D\u901A\u8FC7\u7ED3\u679C"}:Cl(s,i.taskRevision,t.stepSha256,t.candidateId),o=null,l=null;if(e.meshBlocked)l={code:e.meshBlocked.reason,message:e.meshBlocked.message,detail:e.meshBlocked.artifactId?`\u53EF\u901A\u8FC7 fitplate.artifact \u5206\u5757\u4E0B\u8F7D ${e.meshBlocked.artifactId}${e.meshBlocked.totalBytes===null?"":`\uFF08${(e.meshBlocked.totalBytes/1024).toFixed(0)}KiB\uFF09`}`:""};else if(e.mesh)try{o=Lu(e.mesh,{candidateId:e.identity.candidateId,stepSha256:e.identity.stepSha256})}catch(m){if(m instanceof Lt)l={code:m.code,message:m.message,detail:m.detail};else throw m}else l={code:"MESH_MISSING",message:"\u670D\u52A1\u54CD\u5E94\u4E2D\u6CA1\u6709\u7F51\u683C\uFF0C\u4E5F\u6CA1\u6709\u8BF4\u660E\u539F\u56E0",detail:""};let c=Xu({report:s,evidence:e.evidence,design:e.design,device:e.device}),u=qu(s,e.task),d=u.thicknessMm,{envelopes:h,notes:p}=$u({scene:e.scene,task:e.task,pose:c,plateTopZ:d});return c.center&&this.poseHistory.set(e.identity.candidateId,[c.center[0],c.center[1]]),{identity:e.identity,mesh:o,meshRejection:l,task:e.task,scene:e.scene,report:s,reportSource:r,reportFreshness:a,reportFingerprint:Ul(i,t),evidence:e.evidence,design:e.design,pose:c,envelopes:h,envelopeNotes:p,plateThickness:u}}async readArtifact(e,t={}){let i=this.snapshot,s=i.run,r=i.selectedVersion;if(!s||!r||!this.sessionKey)return this.update({downloadError:{kind:"error",title:"\u6CA1\u6709\u53EF\u4E0B\u8F7D\u7684\u5019\u9009\u7248\u672C"}}),null;let a=i.scene?.report??r.report;if(a!==null&&a.overall!=="PASS"&&!t.confirmedFailure)return this.update({downloadError:{kind:"warn",title:`\u5019\u9009 ${r.candidateId} \u672A\u901A\u8FC7\uFF08overall=${a.overall}\uFF09\uFF0C\u4E0B\u8F7D\u5DF2\u53D6\u6D88`,detail:"\u5931\u8D25\u7248\u672C\u53EA\u7528\u4E8E\u8BCA\u65AD\uFF1B\u786E\u8BA4\u540E\u6587\u4EF6\u540D\u4F1A\u5E26 FAILED- \u524D\u7F00\u3002"}}),null;this.update({download:{artifactId:e.artifactId,received:0,total:e.bytes},downloadError:null});try{let l=await nh(this.call,{sessionKey:this.sessionKey,runId:s.runId,candidateId:r.candidateId,artifactId:e.artifactId,expectedSha256:e.sha256,onProgress:(c,u)=>{this.update({download:{artifactId:e.artifactId,received:c,total:u}})}});return this.update({download:null}),l}catch(l){let c=l instanceof He?l:Qi(ji,l);return this.update({download:null,downloadError:sh(c)}),null}}clearDownloadError(){this.update({downloadError:null})}isFailureVersion(){let e=this.snapshot.scene?.report??this.snapshot.selectedVersion?.report??null;return e!==null&&e.overall!=="PASS"}setCompareBaseline(e){if(this.disposed)return;let t=this.snapshot.run;if(e!==null&&(!t||!t.versions.some(r=>r.candidateId===e))){this.update({baselineNotice:{kind:"warn",title:"\u8BE5\u7248\u672C\u4E0D\u5728\u672C\u6B21\u8FD0\u884C\u4E2D\uFF0C\u4E0D\u80FD\u4F5C\u4E3A\u5BF9\u6BD4\u57FA\u51C6\u3002"}});return}if(e===this.snapshot.compareBaselineId)return;if(this.compareToken+=1,e===null||!t){this.baselineFingerprint=null,this.update({compareBaselineId:e,baselineScene:null,baselineNotice:null,baselineBusy:!1,comparePoseText:null});return}let i=t.versions.find(r=>r.candidateId===e),s=qr(t,i);this.baselineFingerprint=s,this.update({compareBaselineId:e,baselineScene:null,baselineNotice:null,baselineBusy:!0,comparePoseText:null}),this.loadBaselineScene(e,t.runId,s,this.compareToken,this.gate.token)}resetCompare(e){this.compareToken+=1,this.baselineFingerprint=null,!(this.snapshot.compareBaselineId===null&&this.snapshot.baselineScene===null)&&this.update({compareBaselineId:null,baselineScene:null,baselineNotice:{kind:"info",title:e},baselineBusy:!1,comparePoseText:null})}revalidateCompareBaseline(e){let t=this.snapshot.compareBaselineId;if(t===null)return;let i=e.versions.find(r=>r.candidateId===t);if(!i){this.resetCompare("\u5BF9\u6BD4\u57FA\u51C6\u5DF2\u4E0D\u5728\u672C\u6B21\u8FD0\u884C\u4E2D\uFF1A\u5BF9\u6BD4\u5DF2\u91CD\u7F6E\u3002");return}let s=qr(e,i);this.baselineFingerprint!==s&&(this.compareToken+=1,this.baselineFingerprint=s,this.update({baselineScene:null,baselineBusy:!0,baselineNotice:null,comparePoseText:null}),this.loadBaselineScene(t,e.runId,s,this.compareToken,this.gate.token))}async loadBaselineScene(e,t,i,s,r){let a=()=>{if(!this.isCurrent(r)||s!==this.compareToken||this.baselineFingerprint!==i||this.snapshot.compareBaselineId!==e)return null;let o=this.liveRun;if(!o||o.runId!==t)return null;let l=o.versions.find(c=>c.candidateId===e);return!l||qr(o,l)!==i?null:{run:o,version:l}};try{let o=await this.call(Ni,{session_key:this.sessionKey,run_id:t,candidate_id:e}),l=a();if(!l)return;let c=Ll(o,{runId:l.run.runId,candidateId:e,stepSha256:l.version.stepSha256,reportId:l.version.report?.reportId,reportFileSha256:l.version.reportFileSha256,reportSha256:l.version.reportSha256}),u=this.buildSceneState(c,l.version,l.run);if(!a())return;this.update({baselineScene:u,baselineBusy:!1,baselineNotice:null}),this.refreshComparePose()}catch(o){if(!a())return;let l=o instanceof He?o:Qi(Ni,o);this.update({baselineScene:null,baselineBusy:!1,baselineNotice:{kind:"warn",title:`\u57FA\u51C6\u7248\u672C ${e} \u7684\u573A\u666F\u4E0D\u53EF\u7528\uFF1A${l.message}`,detail:"\u5BF9\u6BD4\u53EA\u5C55\u793A\u62A5\u544A\u5DEE\u5F02\uFF1B\u4E0D\u4F1A\u7528\u793A\u610F\u7F51\u683C\u66FF\u4EE3\u771F\u5B9E STEP \u7F51\u683C\u3002",code:l.code}})}}refreshComparePose(){let e=this.snapshot.compareBaselineId,t=this.snapshot.selectedCandidateId,i=e!==null?this.poseHistory.get(e):void 0,s=t!==null?this.poseHistory.get(t):void 0;if(e===null||t===null||e===t||!i||!s){this.snapshot.comparePoseText!==null&&this.update({comparePoseText:null});return}let r=c=>Number.isInteger(c)?String(c):c.toFixed(2),a=s[0]-i[0],o=s[1]-i[1],l=Math.abs(a)<1e-6&&Math.abs(o)<1e-6?`\u5B9E\u6D4B\u4E2D\u5FC3\uFF08\u5404\u7248\u672C\u81EA\u8EAB\u573A\u666F\u7684 G04 \u4F4D\u59FF\uFF09\uFF1A\u57FA\u51C6 ${e} \u4E0E\u5F53\u524D ${t} \u76F8\u540C (${r(s[0])}, ${r(s[1])}) mm`:`\u5B9E\u6D4B\u4E2D\u5FC3\uFF08\u5404\u7248\u672C\u81EA\u8EAB\u573A\u666F\u7684 G04 \u4F4D\u59FF\uFF09\uFF1A\u57FA\u51C6 ${e} (${r(i[0])}, ${r(i[1])}) \u2192 \u5F53\u524D ${t} (${r(s[0])}, ${r(s[1])}) mm\uFF0C\u0394=(${r(a)}, ${r(o)}) mm`;this.update({comparePoseText:l})}};var bi={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Si={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Ph=0,dc=1,Nh=2;var vr=1,Dh=2,Rs=3,Mi=0,Jt=1,jt=2,zn=0,Cs=1,fc=2,pc=3,mc=4,Lh=5;var zi=100,Uh=101,Fh=102,Oh=103,kh=104,Bh=200,zh=201,Vh=202,Hh=203,gc=204,_c=205,Gh=206,Wh=207,Xh=208,qh=209,$h=210,Yh=211,Zh=212,Kh=213,Jh=214,ya=0,ba=1,Sa=2,gs=3,Ma=4,Ea=5,Ta=6,wa=7,vc=0,jh=1,Qh=2,An=0,xc=1,yc=2,bc=3,Sc=4,Mc=5,Ec=6,Tc=7;var wc=300,Ei=301,Vi=302,eo=303,to=304,xr=306,Aa=1e3,kn=1001,Ra=1002,Ot=1003,ed=1004;var yr=1005;var Bt=1006,no=1007;var Ti=1008;var sn=1009,Ac=1010,Rc=1011,Is=1012,io=1013,Rn=1014,Cn=1015,In=1016,so=1017,ro=1018,Ps=1020,Cc=35902,Ic=35899,Pc=1021,Nc=1022,yn=1023,Bn=1026,wi=1027,Dc=1028,ao=1029,Ai=1030,oo=1031;var lo=1033,br=33776,Sr=33777,Mr=33778,Er=33779,co=35840,uo=35841,ho=35842,fo=35843,po=36196,mo=37492,go=37496,_o=37488,vo=37489,Tr=37490,xo=37491,yo=37808,bo=37809,So=37810,Mo=37811,Eo=37812,To=37813,wo=37814,Ao=37815,Ro=37816,Co=37817,Io=37818,Po=37819,No=37820,Do=37821,Lo=36492,Uo=36494,Fo=36495,Oo=36283,ko=36284,wr=36285,Bo=36286;var Js=2300,Ca=2301,va=2302,rc=2303,ac=2400,oc=2401,lc=2402;var td=3200;var zo=0,nd=1,ti="",hn="srgb",js="srgb-linear",Qs="linear",dt="srgb";var xa=7680;var id=519,sd=512,rd=513,ad=514,Vo=515,od=516,ld=517,Ho=518,cd=519,ud=35044;var Lc="300 es",Tn=2e3,_s=2001;function jf(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Qf(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function er(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function hd(){let n=er("canvas");return n.style.display="block",n}var rh={},vs=null;function Uc(...n){let e="THREE."+n.shift();vs?vs("log",e,...n):console.log(e,...n)}function dd(n){let e=n[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=n[1];t&&t.isStackTrace?n[0]+=" "+t.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function Ue(...n){n=dd(n);let e="THREE."+n.shift();if(vs)vs("warn",e,...n);else{let t=n[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...n)}}function ke(...n){n=dd(n);let e="THREE."+n.shift();if(vs)vs("error",e,...n);else{let t=n[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...n)}}function Oi(...n){let e=n.join(" ");e in rh||(rh[e]=!0,Ue(...n))}function fd(n,e,t){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:i()}}setTimeout(r,t)})}var pd={[ya]:ba,[Sa]:Ta,[Ma]:wa,[gs]:Ea,[ba]:ya,[Ta]:Sa,[wa]:Ma,[Ea]:gs},wn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){let i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){let i=this._listeners;if(i===void 0)return;let s=i[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let i=t[e.type];if(i!==void 0){e.target=this;let s=i.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}},Wt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],ah=1234567,ps=Math.PI/180,xs=180/Math.PI;function Ns(){let n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Wt[n&255]+Wt[n>>8&255]+Wt[n>>16&255]+Wt[n>>24&255]+"-"+Wt[e&255]+Wt[e>>8&255]+"-"+Wt[e>>16&15|64]+Wt[e>>24&255]+"-"+Wt[t&63|128]+Wt[t>>8&255]+"-"+Wt[t>>16&255]+Wt[t>>24&255]+Wt[i&255]+Wt[i>>8&255]+Wt[i>>16&255]+Wt[i>>24&255]).toLowerCase()}function et(n,e,t){return Math.max(e,Math.min(t,n))}function Fc(n,e){return(n%e+e)%e}function ep(n,e,t,i,s){return i+(n-e)*(s-i)/(t-e)}function tp(n,e,t){return n!==e?(t-n)/(e-n):0}function Ks(n,e,t){return(1-t)*n+t*e}function np(n,e,t,i){return Ks(n,e,1-Math.exp(-t*i))}function ip(n,e=1){return e-Math.abs(Fc(n,e*2)-e)}function sp(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function rp(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function ap(n,e){return n+Math.floor(Math.random()*(e-n+1))}function op(n,e){return n+Math.random()*(e-n)}function lp(n){return n*(.5-Math.random())}function cp(n){n!==void 0&&(ah=n);let e=ah+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function up(n){return n*ps}function hp(n){return n*xs}function dp(n){return n>0&&Number.isInteger(n)&&2**Math.round(Math.log2(n))===n}function fp(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function pp(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function mp(n,e,t,i,s){let r=Math.cos,a=Math.sin,o=r(t/2),l=a(t/2),c=r((e+i)/2),u=a((e+i)/2),d=r((e-i)/2),h=a((e-i)/2),p=r((i-e)/2),m=a((i-e)/2);switch(s){case"XYX":n.set(o*u,l*d,l*h,o*c);break;case"YZY":n.set(l*h,o*u,l*d,o*c);break;case"ZXZ":n.set(l*d,l*h,o*u,o*c);break;case"XZX":n.set(o*u,l*m,l*p,o*c);break;case"YXY":n.set(l*p,o*u,l*m,o*c);break;case"ZYZ":n.set(l*m,l*p,o*u,o*c);break;default:Ue("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function fs(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:case Uint8ClampedArray:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function Kt(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Ar={DEG2RAD:ps,RAD2DEG:xs,generateUUID:Ns,clamp:et,euclideanModulo:Fc,mapLinear:ep,inverseLerp:tp,lerp:Ks,damp:np,pingpong:ip,smoothstep:sp,smootherstep:rp,randInt:ap,randFloat:op,randFloatSpread:lp,seededRandom:cp,degToRad:up,radToDeg:hp,isPowerOfTwo:dp,ceilPowerOfTwo:fp,floorPowerOfTwo:pp,setQuaternionFromProperEuler:mp,normalize:Kt,denormalize:fs},Be=class n{static{n.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,i=this.y,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6],this.y=s[1]*t+s[4]*i+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=et(this.x,e.x,t.x),this.y=et(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=et(this.x,e,t),this.y=et(this.y,e,t),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(et(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(et(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let i=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*i-a*s+e.x,this.y=r*s+a*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},fn=class{constructor(e=0,t=0,i=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=s}static slerpFlat(e,t,i,s,r,a,o){let l=i[s+0],c=i[s+1],u=i[s+2],d=i[s+3],h=r[a+0],p=r[a+1],m=r[a+2],y=r[a+3];if(d!==y||l!==h||c!==p||u!==m){let g=l*h+c*p+u*m+d*y;g<0&&(h=-h,p=-p,m=-m,y=-y,g=-g);let f=1-o;if(g<.9995){let M=Math.acos(g),C=Math.sin(M);f=Math.sin(f*M)/C,o=Math.sin(o*M)/C,l=l*f+h*o,c=c*f+p*o,u=u*f+m*o,d=d*f+y*o}else{l=l*f+h*o,c=c*f+p*o,u=u*f+m*o,d=d*f+y*o;let M=1/Math.sqrt(l*l+c*c+u*u+d*d);l*=M,c*=M,u*=M,d*=M}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=d}static multiplyQuaternionsFlat(e,t,i,s,r,a){let o=i[s],l=i[s+1],c=i[s+2],u=i[s+3],d=r[a],h=r[a+1],p=r[a+2],m=r[a+3];return e[t]=o*m+u*d+l*p-c*h,e[t+1]=l*m+u*h+c*d-o*p,e[t+2]=c*m+u*p+o*h-l*d,e[t+3]=u*m-o*d-l*h-c*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,s){return this._x=e,this._y=t,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let i=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(i/2),u=o(s/2),d=o(r/2),h=l(i/2),p=l(s/2),m=l(r/2);switch(a){case"XYZ":this._x=h*u*d+c*p*m,this._y=c*p*d-h*u*m,this._z=c*u*m+h*p*d,this._w=c*u*d-h*p*m;break;case"YXZ":this._x=h*u*d+c*p*m,this._y=c*p*d-h*u*m,this._z=c*u*m-h*p*d,this._w=c*u*d+h*p*m;break;case"ZXY":this._x=h*u*d-c*p*m,this._y=c*p*d+h*u*m,this._z=c*u*m+h*p*d,this._w=c*u*d-h*p*m;break;case"ZYX":this._x=h*u*d-c*p*m,this._y=c*p*d+h*u*m,this._z=c*u*m-h*p*d,this._w=c*u*d+h*p*m;break;case"YZX":this._x=h*u*d+c*p*m,this._y=c*p*d+h*u*m,this._z=c*u*m-h*p*d,this._w=c*u*d-h*p*m;break;case"XZY":this._x=h*u*d-c*p*m,this._y=c*p*d-h*u*m,this._z=c*u*m+h*p*d,this._w=c*u*d+h*p*m;break;default:Ue("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let i=t/2,s=Math.sin(i);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,i=t[0],s=t[4],r=t[8],a=t[1],o=t[5],l=t[9],c=t[2],u=t[6],d=t[10],h=i+o+d;if(h>0){let p=.5/Math.sqrt(h+1);this._w=.25/p,this._x=(u-l)*p,this._y=(r-c)*p,this._z=(a-s)*p}else if(i>o&&i>d){let p=2*Math.sqrt(1+i-o-d);this._w=(u-l)/p,this._x=.25*p,this._y=(s+a)/p,this._z=(r+c)/p}else if(o>d){let p=2*Math.sqrt(1+o-i-d);this._w=(r-c)/p,this._x=(s+a)/p,this._y=.25*p,this._z=(l+u)/p}else{let p=2*Math.sqrt(1+d-i-o);this._w=(a-s)/p,this._x=(r+c)/p,this._y=(l+u)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(et(this.dot(e),-1,1)))}rotateTowards(e,t){let i=this.angleTo(e);if(i===0)return this;let s=Math.min(1,t/i);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let i=e._x,s=e._y,r=e._z,a=e._w,o=t._x,l=t._y,c=t._z,u=t._w;return this._x=i*u+a*o+s*c-r*l,this._y=s*u+a*l+r*o-i*c,this._z=r*u+a*c+i*l-s*o,this._w=a*u-i*o-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){let i=e._x,s=e._y,r=e._z,a=e._w,o=this.dot(e);o<0&&(i=-i,s=-s,r=-r,a=-a,o=-o);let l=1-t;if(o<.9995){let c=Math.acos(o),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+a*t,this._onChangeCallback()}else this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+a*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},U=class n{static{n.prototype.isVector3=!0}constructor(e=0,t=0,i=0){this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(oh.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(oh.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6]*s,this.y=r[1]*t+r[4]*i+r[7]*s,this.z=r[2]*t+r[5]*i+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,i=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*i+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*i+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*i+r[10]*s+r[14])*a,this}applyQuaternion(e){let t=this.x,i=this.y,s=this.z,r=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*s-o*i),u=2*(o*t-r*s),d=2*(r*i-a*t);return this.x=t+l*c+a*d-o*u,this.y=i+l*u+o*c-r*d,this.z=s+l*d+r*u-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*s,this.y=r[1]*t+r[5]*i+r[9]*s,this.z=r[2]*t+r[6]*i+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=et(this.x,e.x,t.x),this.y=et(this.y,e.y,t.y),this.z=et(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=et(this.x,e,t),this.y=et(this.y,e,t),this.z=et(this.z,e,t),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(et(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let i=e.x,s=e.y,r=e.z,a=t.x,o=t.y,l=t.z;return this.x=s*l-r*o,this.y=r*a-i*l,this.z=i*o-s*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Fl.copy(this).projectOnVector(e),this.sub(Fl)}reflect(e){return this.sub(Fl.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(et(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y,s=this.z-e.z;return t*t+i*i+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){let s=Math.sin(t)*e;return this.x=s*Math.sin(i),this.y=Math.cos(t)*e,this.z=s*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Fl=new U,oh=new fn,Ve=class n{static{n.prototype.isMatrix3=!0}constructor(e,t,i,s,r,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,a,o,l,c)}set(e,t,i,s,r,a,o,l,c){let u=this.elements;return u[0]=e,u[1]=s,u[2]=o,u[3]=t,u[4]=r,u[5]=l,u[6]=i,u[7]=a,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,s=t.elements,r=this.elements,a=i[0],o=i[3],l=i[6],c=i[1],u=i[4],d=i[7],h=i[2],p=i[5],m=i[8],y=s[0],g=s[3],f=s[6],M=s[1],C=s[4],S=s[7],E=s[2],w=s[5],I=s[8];return r[0]=a*y+o*M+l*E,r[3]=a*g+o*C+l*w,r[6]=a*f+o*S+l*I,r[1]=c*y+u*M+d*E,r[4]=c*g+u*C+d*w,r[7]=c*f+u*S+d*I,r[2]=h*y+p*M+m*E,r[5]=h*g+p*C+m*w,r[8]=h*f+p*S+m*I,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8];return t*a*u-t*o*c-i*r*u+i*o*l+s*r*c-s*a*l}invert(){let e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],d=u*a-o*c,h=o*l-u*r,p=c*r-a*l,m=t*d+i*h+s*p;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/m;return e[0]=d*y,e[1]=(s*c-u*i)*y,e[2]=(o*i-s*a)*y,e[3]=h*y,e[4]=(u*t-s*l)*y,e[5]=(s*r-o*t)*y,e[6]=p*y,e[7]=(i*l-c*t)*y,e[8]=(a*t-i*r)*y,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,s,r,a,o){let l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*a+c*o)+a+e,-s*c,s*l,-s*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return Oi("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Ol.makeScale(e,t)),this}rotate(e){return Oi("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Ol.makeRotation(-e)),this}translate(e,t){return Oi("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Ol.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,i=e.elements;for(let s=0;s<9;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Ol=new Ve,lh=new Ve().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ch=new Ve().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function gp(){let n={enabled:!0,workingColorSpace:js,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===dt&&(s.r=jn(s.r),s.g=jn(s.g),s.b=jn(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===dt&&(s.r=ms(s.r),s.g=ms(s.g),s.b=ms(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===ti?Qs:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Oi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Oi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[js]:{primaries:e,whitePoint:i,transfer:Qs,toXYZ:lh,fromXYZ:ch,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:hn},outputColorSpaceConfig:{drawingBufferColorSpace:hn}},[hn]:{primaries:e,whitePoint:i,transfer:dt,toXYZ:lh,fromXYZ:ch,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:hn}}}),n}var ot=gp();function jn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function ms(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}var es,Ia=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{es===void 0&&(es=er("canvas")),es.width=e.width,es.height=e.height;let s=es.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),i=es}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=er("canvas");t.width=e.width,t.height=e.height;let i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);let s=i.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=jn(r[a]/255)*255;return i.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(jn(t[i]/255)*255):t[i]=jn(t[i]);return{data:t,width:e.width,height:e.height}}else return Ue("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},_p=0,ys=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:_p++}),this.uuid=Ns(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(kl(s[a].image)):r.push(kl(s[a]))}else r=kl(s);i.url=r}return t||(e.images[this.uuid]=i),i}};function kl(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Ia.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Ue("Texture: Unable to serialize Texture."),{})}var vp=0,Bl=new U,tn=class n extends wn{constructor(e=n.DEFAULT_IMAGE,t=n.DEFAULT_MAPPING,i=kn,s=kn,r=Bt,a=Ti,o=yn,l=sn,c=n.DEFAULT_ANISOTROPY,u=ti){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:vp++}),this.uuid=Ns(),this.name="",this.source=new ys(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Be(0,0),this.repeat=new Be(1,1),this.center=new Be(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ve,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Bl).x}get height(){return this.source.getSize(Bl).y}get depth(){return this.source.getSize(Bl).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let i=e[t];if(i===void 0){Ue(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Ue(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[t]=i}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==wc)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Aa:e.x=e.x-Math.floor(e.x);break;case kn:e.x=e.x<0?0:1;break;case Ra:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Aa:e.y=e.y-Math.floor(e.y);break;case kn:e.y=e.y<0?0:1;break;case Ra:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};tn.DEFAULT_IMAGE=null;tn.DEFAULT_MAPPING=wc;tn.DEFAULT_ANISOTROPY=1;var Tt=class n{static{n.prototype.isVector4=!0}constructor(e=0,t=0,i=0,s=1){this.x=e,this.y=t,this.z=i,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,s){return this.x=e,this.y=t,this.z=i,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,i=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*i+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*i+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*i+a[11]*s+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,s,r,l=e.elements,c=l[0],u=l[4],d=l[8],h=l[1],p=l[5],m=l[9],y=l[2],g=l[6],f=l[10];if(Math.abs(u-h)<.01&&Math.abs(d-y)<.01&&Math.abs(m-g)<.01){if(Math.abs(u+h)<.1&&Math.abs(d+y)<.1&&Math.abs(m+g)<.1&&Math.abs(c+p+f-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let C=(c+1)/2,S=(p+1)/2,E=(f+1)/2,w=(u+h)/4,I=(d+y)/4,v=(m+g)/4;return C>S&&C>E?C<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(C),s=w/i,r=I/i):S>E?S<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(S),i=w/s,r=v/s):E<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(E),i=I/r,s=v/r),this.set(i,s,r,t),this}let M=Math.sqrt((g-m)*(g-m)+(d-y)*(d-y)+(h-u)*(h-u));return Math.abs(M)<.001&&(M=1),this.x=(g-m)/M,this.y=(d-y)/M,this.z=(h-u)/M,this.w=Math.acos((c+p+f-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=et(this.x,e.x,t.x),this.y=et(this.y,e.y,t.y),this.z=et(this.z,e.z,t.z),this.w=et(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=et(this.x,e,t),this.y=et(this.y,e,t),this.z=et(this.z,e,t),this.w=et(this.w,e,t),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(et(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Pa=class extends wn{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Bt,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new Tt(0,0,e,t),this.scissorTest=!1,this.viewport=new Tt(0,0,e,t),this.textures=[];let s={width:e,height:t,depth:i.depth},r=new tn(s),a=i.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveColorBuffer=i.resolveColorBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.storeMultisampledColorBuffer=i.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=i.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=i.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:Bt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let s=Object.assign({},e.textures[t].image);this.textures[t].source=new ys(s)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},nn=class extends Pa{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}},tr=class extends tn{constructor(e=null,t=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=kn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Na=class extends tn{constructor(e=null,t=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=kn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}};var Et=class n{static{n.prototype.isMatrix4=!0}constructor(e,t,i,s,r,a,o,l,c,u,d,h,p,m,y,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,a,o,l,c,u,d,h,p,m,y,g)}set(e,t,i,s,r,a,o,l,c,u,d,h,p,m,y,g){let f=this.elements;return f[0]=e,f[4]=t,f[8]=i,f[12]=s,f[1]=r,f[5]=a,f[9]=o,f[13]=l,f[2]=c,f[6]=u,f[10]=d,f[14]=h,f[3]=p,f[7]=m,f[11]=y,f[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new n().fromArray(this.elements)}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){let t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,i=e.elements,s=1/ts.setFromMatrixColumn(e,0).length(),r=1/ts.setFromMatrixColumn(e,1).length(),a=1/ts.setFromMatrixColumn(e,2).length();return t[0]=i[0]*s,t[1]=i[1]*s,t[2]=i[2]*s,t[3]=0,t[4]=i[4]*r,t[5]=i[5]*r,t[6]=i[6]*r,t[7]=0,t[8]=i[8]*a,t[9]=i[9]*a,t[10]=i[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,i=e.x,s=e.y,r=e.z,a=Math.cos(i),o=Math.sin(i),l=Math.cos(s),c=Math.sin(s),u=Math.cos(r),d=Math.sin(r);if(e.order==="XYZ"){let h=a*u,p=a*d,m=o*u,y=o*d;t[0]=l*u,t[4]=-l*d,t[8]=c,t[1]=p+m*c,t[5]=h-y*c,t[9]=-o*l,t[2]=y-h*c,t[6]=m+p*c,t[10]=a*l}else if(e.order==="YXZ"){let h=l*u,p=l*d,m=c*u,y=c*d;t[0]=h+y*o,t[4]=m*o-p,t[8]=a*c,t[1]=a*d,t[5]=a*u,t[9]=-o,t[2]=p*o-m,t[6]=y+h*o,t[10]=a*l}else if(e.order==="ZXY"){let h=l*u,p=l*d,m=c*u,y=c*d;t[0]=h-y*o,t[4]=-a*d,t[8]=m+p*o,t[1]=p+m*o,t[5]=a*u,t[9]=y-h*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){let h=a*u,p=a*d,m=o*u,y=o*d;t[0]=l*u,t[4]=m*c-p,t[8]=h*c+y,t[1]=l*d,t[5]=y*c+h,t[9]=p*c-m,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){let h=a*l,p=a*c,m=o*l,y=o*c;t[0]=l*u,t[4]=y-h*d,t[8]=m*d+p,t[1]=d,t[5]=a*u,t[9]=-o*u,t[2]=-c*u,t[6]=p*d+m,t[10]=h-y*d}else if(e.order==="XZY"){let h=a*l,p=a*c,m=o*l,y=o*c;t[0]=l*u,t[4]=-d,t[8]=c*u,t[1]=h*d+y,t[5]=a*u,t[9]=p*d-m,t[2]=m*d-p,t[6]=o*u,t[10]=y*d+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(xp,e,yp)}lookAt(e,t,i){let s=this.elements;return cn.subVectors(e,t),cn.lengthSq()===0&&(cn.z=1),cn.normalize(),ui.crossVectors(i,cn),ui.lengthSq()===0&&(Math.abs(i.z)===1?cn.x+=1e-4:cn.z+=1e-4,cn.normalize(),ui.crossVectors(i,cn)),ui.normalize(),Yr.crossVectors(cn,ui),s[0]=ui.x,s[4]=Yr.x,s[8]=cn.x,s[1]=ui.y,s[5]=Yr.y,s[9]=cn.y,s[2]=ui.z,s[6]=Yr.z,s[10]=cn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,s=t.elements,r=this.elements,a=i[0],o=i[4],l=i[8],c=i[12],u=i[1],d=i[5],h=i[9],p=i[13],m=i[2],y=i[6],g=i[10],f=i[14],M=i[3],C=i[7],S=i[11],E=i[15],w=s[0],I=s[4],v=s[8],R=s[12],D=s[1],O=s[5],P=s[9],X=s[13],b=s[2],T=s[6],k=s[10],V=s[14],re=s[3],Z=s[7],ne=s[11],se=s[15];return r[0]=a*w+o*D+l*b+c*re,r[4]=a*I+o*O+l*T+c*Z,r[8]=a*v+o*P+l*k+c*ne,r[12]=a*R+o*X+l*V+c*se,r[1]=u*w+d*D+h*b+p*re,r[5]=u*I+d*O+h*T+p*Z,r[9]=u*v+d*P+h*k+p*ne,r[13]=u*R+d*X+h*V+p*se,r[2]=m*w+y*D+g*b+f*re,r[6]=m*I+y*O+g*T+f*Z,r[10]=m*v+y*P+g*k+f*ne,r[14]=m*R+y*X+g*V+f*se,r[3]=M*w+C*D+S*b+E*re,r[7]=M*I+C*O+S*T+E*Z,r[11]=M*v+C*P+S*k+E*ne,r[15]=M*R+C*X+S*V+E*se,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[4],s=e[8],r=e[12],a=e[1],o=e[5],l=e[9],c=e[13],u=e[2],d=e[6],h=e[10],p=e[14],m=e[3],y=e[7],g=e[11],f=e[15],M=l*p-c*h,C=o*p-c*d,S=o*h-l*d,E=a*p-c*u,w=a*h-l*u,I=a*d-o*u;return t*(y*M-g*C+f*S)-i*(m*M-g*E+f*w)+s*(m*C-y*E+f*I)-r*(m*S-y*w+g*I)}determinantAffine(){let e=this.elements,t=e[0],i=e[4],s=e[8],r=e[1],a=e[5],o=e[9],l=e[2],c=e[6],u=e[10];return t*(a*u-o*c)-i*(r*u-o*l)+s*(r*c-a*l)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=i),this}invert(){let e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],d=e[9],h=e[10],p=e[11],m=e[12],y=e[13],g=e[14],f=e[15],M=t*o-i*a,C=t*l-s*a,S=t*c-r*a,E=i*l-s*o,w=i*c-r*o,I=s*c-r*l,v=u*y-d*m,R=u*g-h*m,D=u*f-p*m,O=d*g-h*y,P=d*f-p*y,X=h*f-p*g,b=M*X-C*P+S*O+E*D-w*R+I*v;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let T=1/b;return e[0]=(o*X-l*P+c*O)*T,e[1]=(s*P-i*X-r*O)*T,e[2]=(y*I-g*w+f*E)*T,e[3]=(h*w-d*I-p*E)*T,e[4]=(l*D-a*X-c*R)*T,e[5]=(t*X-s*D+r*R)*T,e[6]=(g*S-m*I-f*C)*T,e[7]=(u*I-h*S+p*C)*T,e[8]=(a*P-o*D+c*v)*T,e[9]=(i*D-t*P-r*v)*T,e[10]=(m*w-y*S+f*M)*T,e[11]=(d*S-u*w-p*M)*T,e[12]=(o*R-a*O-l*v)*T,e[13]=(t*O-i*R+s*v)*T,e[14]=(y*C-m*E-g*M)*T,e[15]=(u*E-d*C+h*M)*T,this}scale(e){let t=this.elements,i=e.x,s=e.y,r=e.z;return t[0]*=i,t[4]*=s,t[8]*=r,t[1]*=i,t[5]*=s,t[9]*=r,t[2]*=i,t[6]*=s,t[10]*=r,t[3]*=i,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,s))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let i=Math.cos(t),s=Math.sin(t),r=1-i,a=e.x,o=e.y,l=e.z,c=r*a,u=r*o;return this.set(c*a+i,c*o-s*l,c*l+s*o,0,c*o+s*l,u*o+i,u*l-s*a,0,c*l-s*o,u*l+s*a,r*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,s,r,a){return this.set(1,i,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,i){let s=this.elements,r=t._x,a=t._y,o=t._z,l=t._w,c=r+r,u=a+a,d=o+o,h=r*c,p=r*u,m=r*d,y=a*u,g=a*d,f=o*d,M=l*c,C=l*u,S=l*d,E=i.x,w=i.y,I=i.z;return s[0]=(1-(y+f))*E,s[1]=(p+S)*E,s[2]=(m-C)*E,s[3]=0,s[4]=(p-S)*w,s[5]=(1-(h+f))*w,s[6]=(g+M)*w,s[7]=0,s[8]=(m+C)*I,s[9]=(g-M)*I,s[10]=(1-(h+y))*I,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,i){let s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];let r=this.determinantAffine();if(r===0)return i.set(1,1,1),t.identity(),this;let a=ts.set(s[0],s[1],s[2]).length(),o=ts.set(s[4],s[5],s[6]).length(),l=ts.set(s[8],s[9],s[10]).length();r<0&&(a=-a),Sn.copy(this);let c=1/a,u=1/o,d=1/l;return Sn.elements[0]*=c,Sn.elements[1]*=c,Sn.elements[2]*=c,Sn.elements[4]*=u,Sn.elements[5]*=u,Sn.elements[6]*=u,Sn.elements[8]*=d,Sn.elements[9]*=d,Sn.elements[10]*=d,t.setFromRotationMatrix(Sn),i.x=a,i.y=o,i.z=l,this}makePerspective(e,t,i,s,r,a,o=Tn,l=!1){let c=this.elements,u=2*r/(t-e),d=2*r/(i-s),h=(t+e)/(t-e),p=(i+s)/(i-s),m,y;if(l)m=r/(a-r),y=a*r/(a-r);else if(o===Tn)m=-(a+r)/(a-r),y=-2*a*r/(a-r);else if(o===_s)m=-a/(a-r),y=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=d,c[9]=p,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=y,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,s,r,a,o=Tn,l=!1){let c=this.elements,u=2/(t-e),d=2/(i-s),h=-(t+e)/(t-e),p=-(i+s)/(i-s),m,y;if(l)m=1/(a-r),y=a/(a-r);else if(o===Tn)m=-2/(a-r),y=-(a+r)/(a-r);else if(o===_s)m=-1/(a-r),y=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=0,c[12]=h,c[1]=0,c[5]=d,c[9]=0,c[13]=p,c[2]=0,c[6]=0,c[10]=m,c[14]=y,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,i=e.elements;for(let s=0;s<16;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}},ts=new U,Sn=new Et,xp=new U(0,0,0),yp=new U(1,1,1),ui=new U,Yr=new U,cn=new U,uh=new Et,hh=new fn,Qn=class n{constructor(e=0,t=0,i=0,s=n.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,s=this._order){return this._x=e,this._y=t,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){let s=e.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],u=s[9],d=s[2],h=s[6],p=s[10];switch(t){case"XYZ":this._y=Math.asin(et(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,p),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-et(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(et(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-d,p),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-et(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(h,p),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(et(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-et(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-u,p),this._y=0);break;default:Ue("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return uh.makeRotationFromQuaternion(e),this.setFromRotationMatrix(uh,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return hh.setFromEuler(this),this.setFromQuaternion(hh,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Qn.DEFAULT_ORDER="XYZ";var nr=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},bp=0,dh=new U,ns=new fn,qn=new Et,Zr=new U,Xs=new U,Sp=new U,Mp=new fn,fh=new U(1,0,0),ph=new U(0,1,0),mh=new U(0,0,1),gh={type:"added"},Ep={type:"removed"},is={type:"childadded",child:null},zl={type:"childremoved",child:null},zt=class n extends wn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:bp++}),this.uuid=Ns(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=n.DEFAULT_UP.clone();let e=new U,t=new Qn,i=new fn,s=new U(1,1,1);function r(){i.setFromEuler(t,!1)}function a(){t.setFromQuaternion(i,void 0,!1)}t._onChange(r),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Et},normalMatrix:{value:new Ve}}),this.matrix=new Et,this.matrixWorld=new Et,this.matrixAutoUpdate=n.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=n.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new nr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ns.setFromAxisAngle(e,t),this.quaternion.multiply(ns),this}rotateOnWorldAxis(e,t){return ns.setFromAxisAngle(e,t),this.quaternion.premultiply(ns),this}rotateX(e){return this.rotateOnAxis(fh,e)}rotateY(e){return this.rotateOnAxis(ph,e)}rotateZ(e){return this.rotateOnAxis(mh,e)}translateOnAxis(e,t){return dh.copy(e).applyQuaternion(this.quaternion),this.position.add(dh.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(fh,e)}translateY(e){return this.translateOnAxis(ph,e)}translateZ(e){return this.translateOnAxis(mh,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(qn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Zr.copy(e):Zr.set(e,t,i);let s=this.parent;this.updateWorldMatrix(!0,!1),Xs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?qn.lookAt(Xs,Zr,this.up):qn.lookAt(Zr,Xs,this.up),this.quaternion.setFromRotationMatrix(qn),s&&(qn.extractRotation(s.matrixWorld),ns.setFromRotationMatrix(qn),this.quaternion.premultiply(ns.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(ke("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(gh),is.child=e,this.dispatchEvent(is),is.child=null):ke("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Ep),zl.child=e,this.dispatchEvent(zl),zl.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),qn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),qn.multiply(e.parent.matrixWorld)),e.applyMatrix4(qn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(gh),is.child=e,this.dispatchEvent(is),is.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,s=this.children.length;i<s;i++){let a=this.children[i].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Xs,e,Sp),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Xs,Mp,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(e){e(this);let t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,i=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*i-r[8]*s,r[13]+=i-r[1]*t-r[5]*i-r[9]*s,r[14]+=s-r[2]*t-r[6]*i-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t,i=!1){let s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),t===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,i)}}toJSON(e){let t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){let d=l[c];r(e.shapes,d)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(e.materials,this.material[l]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];s.animations.push(r(e.animations,l))}}if(t){let o=a(e.geometries),l=a(e.materials),c=a(e.textures),u=a(e.images),d=a(e.shapes),h=a(e.skeletons),p=a(e.animations),m=a(e.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),d.length>0&&(i.shapes=d),h.length>0&&(i.skeletons=h),p.length>0&&(i.animations=p),m.length>0&&(i.nodes=m)}return i.object=s,i;function a(o){let l=[];for(let c in o){let u=o[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){let s=e.children[i];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};zt.DEFAULT_UP=new U(0,1,0);zt.DEFAULT_MATRIX_AUTO_UPDATE=!0;zt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var en=class extends zt{constructor(){super(),this.isGroup=!0,this.type="Group"}},Tp={type:"move"},bs=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new en,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new en,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new en,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let s=null,r=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(let y of e.hand.values()){let g=t.getJointPose(y,i),f=this._getHandJoint(c,y);g!==null&&(f.matrix.fromArray(g.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=g.radius),f.visible=g!==null}let u=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],h=u.position.distanceTo(d.position),p=.02,m=.005;c.inputState.pinching&&h>p+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&h<=p-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(s=t.getPose(e.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Tp)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let i=new en;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}},md={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},hi={h:0,s:0,l:0},Kr={h:0,s:0,l:0};function Vl(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}var tt=class{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=hn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,ot.colorSpaceToWorking(this,t),this}setRGB(e,t,i,s=ot.workingColorSpace){return this.r=e,this.g=t,this.b=i,ot.colorSpaceToWorking(this,s),this}setHSL(e,t,i,s=ot.workingColorSpace){if(e=Fc(e,1),t=et(t,0,1),i=et(i,0,1),t===0)this.r=this.g=this.b=i;else{let r=i<=.5?i*(1+t):i+t-i*t,a=2*i-r;this.r=Vl(a,r,e+1/3),this.g=Vl(a,r,e),this.b=Vl(a,r,e-1/3)}return ot.colorSpaceToWorking(this,s),this}setStyle(e,t=hn){function i(r){r!==void 0&&parseFloat(r)<1&&Ue("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Ue("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);Ue("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=hn){let i=md[e.toLowerCase()];return i!==void 0?this.setHex(i,t):Ue("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=jn(e.r),this.g=jn(e.g),this.b=jn(e.b),this}copyLinearToSRGB(e){return this.r=ms(e.r),this.g=ms(e.g),this.b=ms(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=hn){return ot.workingToColorSpace(Xt.copy(this),e),Math.round(et(Xt.r*255,0,255))*65536+Math.round(et(Xt.g*255,0,255))*256+Math.round(et(Xt.b*255,0,255))}getHexString(e=hn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=ot.workingColorSpace){ot.workingToColorSpace(Xt.copy(this),t);let i=Xt.r,s=Xt.g,r=Xt.b,a=Math.max(i,s,r),o=Math.min(i,s,r),l,c,u=(o+a)/2;if(o===a)l=0,c=0;else{let d=a-o;switch(c=u<=.5?d/(a+o):d/(2-a-o),a){case i:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-i)/d+2;break;case r:l=(i-s)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=ot.workingColorSpace){return ot.workingToColorSpace(Xt.copy(this),t),e.r=Xt.r,e.g=Xt.g,e.b=Xt.b,e}getStyle(e=hn){ot.workingToColorSpace(Xt.copy(this),e);let t=Xt.r,i=Xt.g,s=Xt.b;return e!==hn?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(e,t,i){return this.getHSL(hi),this.setHSL(hi.h+e,hi.s+t,hi.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(hi),e.getHSL(Kr);let i=Ks(hi.h,Kr.h,t),s=Ks(hi.s,Kr.s,t),r=Ks(hi.l,Kr.l,t);return this.setHSL(i,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,i=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*i+r[6]*s,this.g=r[1]*t+r[4]*i+r[7]*s,this.b=r[2]*t+r[5]*i+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Xt=new tt;tt.NAMES=md;var ir=class extends zt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Qn,this.environmentIntensity=1,this.environmentRotation=new Qn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},Mn=new U,$n=new U,Hl=new U,Yn=new U,ss=new U,rs=new U,_h=new U,Gl=new U,Wl=new U,Xl=new U,ql=new Tt,$l=new Tt,Yl=new Tt,Jn=class n{constructor(e=new U,t=new U,i=new U){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,s){s.subVectors(i,t),Mn.subVectors(e,t),s.cross(Mn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,i,s,r){Mn.subVectors(s,t),$n.subVectors(i,t),Hl.subVectors(e,t);let a=Mn.dot(Mn),o=Mn.dot($n),l=Mn.dot(Hl),c=$n.dot($n),u=$n.dot(Hl),d=a*c-o*o;if(d===0)return r.set(0,0,0),null;let h=1/d,p=(c*l-o*u)*h,m=(a*u-o*l)*h;return r.set(1-p-m,m,p)}static containsPoint(e,t,i,s){return this.getBarycoord(e,t,i,s,Yn)===null?!1:Yn.x>=0&&Yn.y>=0&&Yn.x+Yn.y<=1}static getInterpolation(e,t,i,s,r,a,o,l){return this.getBarycoord(e,t,i,s,Yn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Yn.x),l.addScaledVector(a,Yn.y),l.addScaledVector(o,Yn.z),l)}static getInterpolatedAttribute(e,t,i,s,r,a){return ql.setScalar(0),$l.setScalar(0),Yl.setScalar(0),ql.fromBufferAttribute(e,t),$l.fromBufferAttribute(e,i),Yl.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(ql,r.x),a.addScaledVector($l,r.y),a.addScaledVector(Yl,r.z),a}static isFrontFacing(e,t,i,s){return Mn.subVectors(i,t),$n.subVectors(e,t),Mn.cross($n).dot(s)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,s){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,i,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Mn.subVectors(this.c,this.b),$n.subVectors(this.a,this.b),Mn.cross($n).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return n.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return n.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,s,r){return n.getInterpolation(e,this.a,this.b,this.c,t,i,s,r)}containsPoint(e){return n.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return n.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let i=this.a,s=this.b,r=this.c,a,o;ss.subVectors(s,i),rs.subVectors(r,i),Gl.subVectors(e,i);let l=ss.dot(Gl),c=rs.dot(Gl);if(l<=0&&c<=0)return t.copy(i);Wl.subVectors(e,s);let u=ss.dot(Wl),d=rs.dot(Wl);if(u>=0&&d<=u)return t.copy(s);let h=l*d-u*c;if(h<=0&&l>=0&&u<=0)return a=l/(l-u),t.copy(i).addScaledVector(ss,a);Xl.subVectors(e,r);let p=ss.dot(Xl),m=rs.dot(Xl);if(m>=0&&p<=m)return t.copy(r);let y=p*c-l*m;if(y<=0&&c>=0&&m<=0)return o=c/(c-m),t.copy(i).addScaledVector(rs,o);let g=u*m-p*d;if(g<=0&&d-u>=0&&p-m>=0)return _h.subVectors(r,s),o=(d-u)/(d-u+(p-m)),t.copy(s).addScaledVector(_h,o);let f=1/(g+y+h);return a=y*f,o=h*f,t.copy(i).addScaledVector(ss,a).addScaledVector(rs,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},xn=class{constructor(e=new U(1/0,1/0,1/0),t=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(En.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(En.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let i=En.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let i=e.geometry;if(i!==void 0){let r=i.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,En):En.fromBufferAttribute(r,a),En.applyMatrix4(e.matrixWorld),this.expandByPoint(En);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Jr.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Jr.copy(i.boundingBox)),Jr.applyMatrix4(e.matrixWorld),this.union(Jr)}let s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,En),En.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(qs),jr.subVectors(this.max,qs),as.subVectors(e.a,qs),os.subVectors(e.b,qs),ls.subVectors(e.c,qs),di.subVectors(os,as),fi.subVectors(ls,os),Di.subVectors(as,ls);let t=[0,-di.z,di.y,0,-fi.z,fi.y,0,-Di.z,Di.y,di.z,0,-di.x,fi.z,0,-fi.x,Di.z,0,-Di.x,-di.y,di.x,0,-fi.y,fi.x,0,-Di.y,Di.x,0];return!Zl(t,as,os,ls,jr)||(t=[1,0,0,0,1,0,0,0,1],!Zl(t,as,os,ls,jr))?!1:(Qr.crossVectors(di,fi),t=[Qr.x,Qr.y,Qr.z],Zl(t,as,os,ls,jr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,En).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(En).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Zn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Zn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Zn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Zn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Zn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Zn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Zn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Zn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Zn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Zn=[new U,new U,new U,new U,new U,new U,new U,new U],En=new U,Jr=new xn,as=new U,os=new U,ls=new U,di=new U,fi=new U,Di=new U,qs=new U,jr=new U,Qr=new U,Li=new U;function Zl(n,e,t,i,s){for(let r=0,a=n.length-3;r<=a;r+=3){Li.fromArray(n,r);let o=s.x*Math.abs(Li.x)+s.y*Math.abs(Li.y)+s.z*Math.abs(Li.z),l=e.dot(Li),c=t.dot(Li),u=i.dot(Li);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}var Ct=new U,ea=new Be,wp=0,kt=class extends wn{constructor(e,t,i=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:wp++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=ud,this.updateRanges=[],this.gpuType=Cn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[i+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)ea.fromBufferAttribute(this,t),ea.applyMatrix3(e),this.setXY(t,ea.x,ea.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix3(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix4(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyNormalMatrix(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.transformDirection(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=fs(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Kt(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=fs(t,this.array)),t}setX(e,t){return this.normalized&&(t=Kt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=fs(t,this.array)),t}setY(e,t){return this.normalized&&(t=Kt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=fs(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Kt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=fs(t,this.array)),t}setW(e,t){return this.normalized&&(t=Kt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Kt(t,this.array),i=Kt(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,s){return e*=this.itemSize,this.normalized&&(t=Kt(t,this.array),i=Kt(i,this.array),s=Kt(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this}setXYZW(e,t,i,s,r){return e*=this.itemSize,this.normalized&&(t=Kt(t,this.array),i=Kt(i,this.array),s=Kt(s,this.array),r=Kt(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}};var sr=class extends kt{constructor(e,t,i){super(new Uint16Array(e),t,i)}};var rr=class extends kt{constructor(e,t,i){super(new Uint32Array(e),t,i)}};var Ft=class extends kt{constructor(e,t,i){super(new Float32Array(e),t,i)}},Ap=new xn,$s=new U,Kl=new U,ki=class{constructor(e=new U,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let i=this.center;t!==void 0?i.copy(t):Ap.setFromPoints(e).getCenter(i);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,i.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;$s.subVectors(e,this.center);let t=$s.lengthSq();if(t>this.radius*this.radius){let i=Math.sqrt(t),s=(i-this.radius)*.5;this.center.addScaledVector($s,s/i),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Kl.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint($s.copy(e.center).add(Kl)),this.expandByPoint($s.copy(e.center).sub(Kl))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Rp=0,vn=new Et,Jl=new zt,cs=new U,un=new xn,Ys=new xn,Ut=new U,$t=class n extends wn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Rp++}),this.uuid=Ns(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(jf(e)?rr:sr)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let r=new Ve().getNormalMatrix(e);i.applyNormalMatrix(r),i.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return vn.makeRotationFromQuaternion(e),this.applyMatrix4(vn),this}rotateX(e){return vn.makeRotationX(e),this.applyMatrix4(vn),this}rotateY(e){return vn.makeRotationY(e),this.applyMatrix4(vn),this}rotateZ(e){return vn.makeRotationZ(e),this.applyMatrix4(vn),this}translate(e,t,i){return vn.makeTranslation(e,t,i),this.applyMatrix4(vn),this}scale(e,t,i){return vn.makeScale(e,t,i),this.applyMatrix4(vn),this}lookAt(e){return Jl.lookAt(e),Jl.updateMatrix(),this.applyMatrix4(Jl.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(cs).negate(),this.translate(cs.x,cs.y,cs.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let i=[];for(let s=0,r=e.length;s<r;s++){let a=e[s];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Ft(i,3))}else{let i=Math.min(e.length,t.count);for(let s=0;s<i;s++){let r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Ue("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new xn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){ke("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,s=t.length;i<s;i++){let r=t[i];un.setFromBufferAttribute(r),this.morphTargetsRelative?(Ut.addVectors(this.boundingBox.min,un.min),this.boundingBox.expandByPoint(Ut),Ut.addVectors(this.boundingBox.max,un.max),this.boundingBox.expandByPoint(Ut)):(this.boundingBox.expandByPoint(un.min),this.boundingBox.expandByPoint(un.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&ke('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ki);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){ke("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new U,1/0);return}if(e){let i=this.boundingSphere.center;if(un.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){let o=t[r];Ys.setFromBufferAttribute(o),this.morphTargetsRelative?(Ut.addVectors(un.min,Ys.min),un.expandByPoint(Ut),Ut.addVectors(un.max,Ys.max),un.expandByPoint(Ut)):(un.expandByPoint(Ys.min),un.expandByPoint(Ys.max))}un.getCenter(i);let s=0;for(let r=0,a=e.count;r<a;r++)Ut.fromBufferAttribute(e,r),s=Math.max(s,i.distanceToSquared(Ut));if(t)for(let r=0,a=t.length;r<a;r++){let o=t[r],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)Ut.fromBufferAttribute(o,c),l&&(cs.fromBufferAttribute(e,c),Ut.add(cs)),s=Math.max(s,i.distanceToSquared(Ut))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&ke('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){ke("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=t.position,s=t.normal,r=t.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==i.count)&&(a=new kt(new Float32Array(4*i.count),4),this.setAttribute("tangent",a));let o=[],l=[];for(let v=0;v<i.count;v++)o[v]=new U,l[v]=new U;let c=new U,u=new U,d=new U,h=new Be,p=new Be,m=new Be,y=new U,g=new U;function f(v,R,D){c.fromBufferAttribute(i,v),u.fromBufferAttribute(i,R),d.fromBufferAttribute(i,D),h.fromBufferAttribute(r,v),p.fromBufferAttribute(r,R),m.fromBufferAttribute(r,D),u.sub(c),d.sub(c),p.sub(h),m.sub(h);let O=1/(p.x*m.y-m.x*p.y);isFinite(O)&&(y.copy(u).multiplyScalar(m.y).addScaledVector(d,-p.y).multiplyScalar(O),g.copy(d).multiplyScalar(p.x).addScaledVector(u,-m.x).multiplyScalar(O),o[v].add(y),o[R].add(y),o[D].add(y),l[v].add(g),l[R].add(g),l[D].add(g))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let v=0,R=M.length;v<R;++v){let D=M[v],O=D.start,P=D.count;for(let X=O,b=O+P;X<b;X+=3)f(e.getX(X+0),e.getX(X+1),e.getX(X+2))}let C=new U,S=new U,E=new U,w=new U;function I(v){E.fromBufferAttribute(s,v),w.copy(E);let R=o[v];C.copy(R),C.sub(E.multiplyScalar(E.dot(R))).normalize(),S.crossVectors(w,R);let O=S.dot(l[v])<0?-1:1;a.setXYZW(v,C.x,C.y,C.z,O)}for(let v=0,R=M.length;v<R;++v){let D=M[v],O=D.start,P=D.count;for(let X=O,b=O+P;X<b;X+=3)I(e.getX(X+0)),I(e.getX(X+1)),I(e.getX(X+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==t.count)i=new kt(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let h=0,p=i.count;h<p;h++)i.setXYZ(h,0,0,0);let s=new U,r=new U,a=new U,o=new U,l=new U,c=new U,u=new U,d=new U;if(e)for(let h=0,p=e.count;h<p;h+=3){let m=e.getX(h+0),y=e.getX(h+1),g=e.getX(h+2);s.fromBufferAttribute(t,m),r.fromBufferAttribute(t,y),a.fromBufferAttribute(t,g),u.subVectors(a,r),d.subVectors(s,r),u.cross(d),o.fromBufferAttribute(i,m),l.fromBufferAttribute(i,y),c.fromBufferAttribute(i,g),o.add(u),l.add(u),c.add(u),i.setXYZ(m,o.x,o.y,o.z),i.setXYZ(y,l.x,l.y,l.z),i.setXYZ(g,c.x,c.y,c.z)}else for(let h=0,p=t.count;h<p;h+=3)s.fromBufferAttribute(t,h+0),r.fromBufferAttribute(t,h+1),a.fromBufferAttribute(t,h+2),u.subVectors(a,r),d.subVectors(s,r),u.cross(d),i.setXYZ(h+0,u.x,u.y,u.z),i.setXYZ(h+1,u.x,u.y,u.z),i.setXYZ(h+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Ut.fromBufferAttribute(e,t),Ut.normalize(),e.setXYZ(t,Ut.x,Ut.y,Ut.z)}toNonIndexed(){function e(o,l){let c=o.array,u=o.itemSize,d=o.normalized,h=new c.constructor(l.length*u),p=0,m=0;for(let y=0,g=l.length;y<g;y++){o.isInterleavedBufferAttribute?p=l[y]*o.data.stride+o.offset:p=l[y]*u;for(let f=0;f<u;f++)h[m++]=c[p++]}return new kt(h,u,d)}if(this.index===null)return Ue("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new n,i=this.index.array,s=this.attributes;for(let o in s){let l=s[o],c=e(l,i);t.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let u=0,d=c.length;u<d;u++){let h=c[u],p=e(h,i);l.push(p)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let i=this.attributes;for(let l in i){let c=i[l];e.data.attributes[l]=c.toJSON(e.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],u=[];for(let d=0,h=c.length;d<h;d++){let p=c[d];u.push(p.toJSON(e.data))}u.length>0&&(s[l]=u,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let i=e.index;i!==null&&this.setIndex(i.clone());let s=e.attributes;for(let c in s){let u=s[c];this.setAttribute(c,u.clone(t))}let r=e.morphAttributes;for(let c in r){let u=[],d=r[c];for(let h=0,p=d.length;h<p;h++)u.push(d[h].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let c=0,u=a.length;c<u;c++){let d=a[c];this.addGroup(d.start,d.count,d.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var jl=new U,Cp=new U,Ip=new Ve,dn=class{constructor(e=new U(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,s){return this.normal.set(e,t,i),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){let s=jl.subVectors(i,t).cross(Cp.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,i=!0){let s=e.delta(jl),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/r;return i===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(s,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let i=t||Ip.getNormalMatrix(e),s=this.coplanarPoint(jl).applyMatrix4(e),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},Pp=0,ei=class extends wn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Pp++}),this.uuid=Ns(),this.name="",this.type="Material",this.blending=Cs,this.side=Mi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=gc,this.blendDst=_c,this.blendEquation=zi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new tt(0,0,0),this.blendAlpha=0,this.depthFunc=gs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=id,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=xa,this.stencilZFail=xa,this.stencilZPass=xa,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let i=e[t];if(i===void 0){Ue(`Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Ue(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector2&&i&&i.isVector2||s&&s.isEuler&&i&&i.isEuler||s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[t]=i}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,i.blending=this.blending,i.side=this.side,i.shadowSide=this.shadowSide,i.vertexColors=this.vertexColors,i.opacity=this.opacity,i.transparent=this.transparent,i.blendSrc=this.blendSrc,i.blendDst=this.blendDst,i.blendEquation=this.blendEquation,i.blendSrcAlpha=this.blendSrcAlpha,i.blendDstAlpha=this.blendDstAlpha,i.blendEquationAlpha=this.blendEquationAlpha,i.blendColor=this.blendColor.getHex(),i.blendAlpha=this.blendAlpha,i.depthFunc=this.depthFunc,i.depthTest=this.depthTest,i.depthWrite=this.depthWrite,i.colorWrite=this.colorWrite,i.clipIntersection=this.clipIntersection,i.clipShadows=this.clipShadows,i.stencilWriteMask=this.stencilWriteMask,i.stencilFunc=this.stencilFunc,i.stencilRef=this.stencilRef,i.stencilFuncMask=this.stencilFuncMask,i.stencilFail=this.stencilFail,i.stencilZFail=this.stencilZFail,i.stencilZPass=this.stencilZPass,i.stencilWrite=this.stencilWrite,i.polygonOffset=this.polygonOffset,i.polygonOffsetFactor=this.polygonOffsetFactor,i.polygonOffsetUnits=this.polygonOffsetUnits,i.dithering=this.dithering,i.alphaTest=this.alphaTest,i.alphaHash=this.alphaHash,i.alphaToCoverage=this.alphaToCoverage,i.premultipliedAlpha=this.premultipliedAlpha,i.forceSinglePass=this.forceSinglePass,i.allowOverride=this.allowOverride,i.visible=this.visible,i.toneMapped=this.toneMapped,i.name=this.name,this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(i.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(i.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(i.rotation=this.rotation),this.depthPacking!==void 0&&(i.depthPacking=this.depthPacking),this.linewidth!==void 0&&(i.linewidth=this.linewidth),this.linecap!==void 0&&(i.linecap=this.linecap),this.linejoin!==void 0&&(i.linejoin=this.linejoin),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.wireframe!==void 0&&(i.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(i.flatShading=this.flatShading),this.fog!==void 0&&(i.fog=this.fog),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){let a=[];for(let o in r){let l=r[o];delete l.metadata,a.push(l)}return a}if(t){let r=s(e.textures),a=s(e.images);r.length>0&&(i.textures=r),a.length>0&&(i.images=a)}return i}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new tt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(i=>new dn().fromJSON(i))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let i=e.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new Be().fromArray(i)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Be().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,i=null;if(t!==null){let s=t.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=t[r].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var Kn=new U,Ql=new U,ta=new U,na=new U,Bi=class{constructor(e=new U,t=new U(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Kn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Kn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Kn.copy(this.origin).addScaledVector(this.direction,t),Kn.distanceToSquared(e))}distanceSqToSegment(e,t,i,s){Ql.copy(e).add(t).multiplyScalar(.5),ta.copy(t).sub(e).normalize(),na.copy(this.origin).sub(Ql);let r=e.distanceTo(t)*.5,a=-this.direction.dot(ta),o=na.dot(this.direction),l=-na.dot(ta),c=na.lengthSq(),u=Math.abs(1-a*a),d,h,p,m;if(u>0)if(d=a*l-o,h=a*o-l,m=r*u,d>=0)if(h>=-m)if(h<=m){let y=1/u;d*=y,h*=y,p=d*(d+a*h+2*o)+h*(a*d+h+2*l)+c}else h=r,d=Math.max(0,-(a*h+o)),p=-d*d+h*(h+2*l)+c;else h=-r,d=Math.max(0,-(a*h+o)),p=-d*d+h*(h+2*l)+c;else h<=-m?(d=Math.max(0,-(-a*r+o)),h=d>0?-r:Math.min(Math.max(-r,-l),r),p=-d*d+h*(h+2*l)+c):h<=m?(d=0,h=Math.min(Math.max(-r,-l),r),p=h*(h+2*l)+c):(d=Math.max(0,-(a*r+o)),h=d>0?r:Math.min(Math.max(-r,-l),r),p=-d*d+h*(h+2*l)+c);else h=a>0?-r:r,d=Math.max(0,-(a*h+o)),p=-d*d+h*(h+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(Ql).addScaledVector(ta,h),p}intersectSphere(e,t){if(e.radius<0)return null;Kn.subVectors(e.center,this.origin);let i=Kn.dot(this.direction),s=Kn.dot(Kn)-i*i,r=e.radius*e.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=i-a,l=i+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){let i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,s,r,a,o,l,c=1/this.direction.x,u=1/this.direction.y,d=1/this.direction.z,h=this.origin;return c>=0?(i=(e.min.x-h.x)*c,s=(e.max.x-h.x)*c):(i=(e.max.x-h.x)*c,s=(e.min.x-h.x)*c),u>=0?(r=(e.min.y-h.y)*u,a=(e.max.y-h.y)*u):(r=(e.max.y-h.y)*u,a=(e.min.y-h.y)*u),i>a||r>s||((r>i||isNaN(i))&&(i=r),(a<s||isNaN(s))&&(s=a),d>=0?(o=(e.min.z-h.z)*d,l=(e.max.z-h.z)*d):(o=(e.max.z-h.z)*d,l=(e.min.z-h.z)*d),i>l||o>s)||((o>i||i!==i)&&(i=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,t)}intersectsBox(e){return this.intersectBox(e,Kn)!==null}intersectTriangle(e,t,i,s,r){let a=this.origin,o=this.direction,l=o.x,c=o.y,u=o.z,d=e.x-a.x,h=e.y-a.y,p=e.z-a.z,m=t.x-a.x,y=t.y-a.y,g=t.z-a.z,f=i.x-a.x,M=i.y-a.y,C=i.z-a.z,S=Math.abs(l),E=Math.abs(c),w=Math.abs(u),I,v,R,D,O,P,X,b,T,k,V,re;if(S>=E&&S>=w?(R=l,P=d,T=m,re=f,l>=0?(I=c,v=u,D=h,O=p,X=y,b=g,k=M,V=C):(I=u,v=c,D=p,O=h,X=g,b=y,k=C,V=M)):E>=w?(R=c,P=h,T=y,re=M,c>=0?(I=u,v=l,D=p,O=d,X=g,b=m,k=C,V=f):(I=l,v=u,D=d,O=p,X=m,b=g,k=f,V=C)):(R=u,P=p,T=g,re=C,u>=0?(I=l,v=c,D=d,O=h,X=m,b=y,k=f,V=M):(I=c,v=l,D=h,O=d,X=y,b=m,k=M,V=f)),R===0)return null;let Z=I/R,ne=v/R,se=1/R,De=D-Z*P,Re=O-ne*P,mt=X-Z*T,nt=b-ne*T,lt=k-Z*re,K=V-ne*re,te=lt*nt-K*mt,be=De*K-Re*lt,ze=mt*Re-nt*De;if(s){if(te<0||be<0||ze<0)return null}else if((te<0||be<0||ze<0)&&(te>0||be>0||ze>0))return null;let ce=te+be+ze;if(ce===0)return null;let Ye=se*(te*P+be*T+ze*re);return(ce>0?Ye<0:Ye>0)?null:this.at(Ye/ce,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},ar=class extends ei{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new tt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Qn,this.combine=vc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},vh=new Et,Ui=new Bi,ia=new ki,xh=new U,sa=new U,ra=new U,aa=new U,ec=new U,oa=new U,yh=new U,la=new U,Vt=class extends zt{constructor(e=new $t,t=new ar){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){let i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,a=i.morphTargetsRelative;t.fromBufferAttribute(s,e);let o=this.morphTargetInfluences;if(r&&o){oa.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let u=o[l],d=r[l];u!==0&&(ec.fromBufferAttribute(d,e),a?oa.addScaledVector(ec,u):oa.addScaledVector(ec.sub(t),u))}t.add(oa)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),ia.copy(i.boundingSphere),ia.applyMatrix4(r),Ui.copy(e.ray).recast(e.near),!(ia.containsPoint(Ui.origin)===!1&&(Ui.intersectSphere(ia,xh)===null||Ui.origin.distanceToSquared(xh)>(e.far-e.near)**2))&&(vh.copy(r).invert(),Ui.copy(e.ray).applyMatrix4(vh),!(i.boundingBox!==null&&Ui.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Ui)))}_computeIntersections(e,t,i){let s,r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,u=r.attributes.uv1,d=r.attributes.normal,h=r.groups,p=r.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,y=h.length;m<y;m++){let g=h[m],f=a[g.materialIndex],M=Math.max(g.start,p.start),C=Math.min(o.count,Math.min(g.start+g.count,p.start+p.count));for(let S=M,E=C;S<E;S+=3){let w=o.getX(S),I=o.getX(S+1),v=o.getX(S+2);s=ca(this,f,e,i,c,u,d,w,I,v),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let m=Math.max(0,p.start),y=Math.min(o.count,p.start+p.count);for(let g=m,f=y;g<f;g+=3){let M=o.getX(g),C=o.getX(g+1),S=o.getX(g+2);s=ca(this,a,e,i,c,u,d,M,C,S),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let m=0,y=h.length;m<y;m++){let g=h[m],f=a[g.materialIndex],M=Math.max(g.start,p.start),C=Math.min(l.count,Math.min(g.start+g.count,p.start+p.count));for(let S=M,E=C;S<E;S+=3){let w=S,I=S+1,v=S+2;s=ca(this,f,e,i,c,u,d,w,I,v),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let m=Math.max(0,p.start),y=Math.min(l.count,p.start+p.count);for(let g=m,f=y;g<f;g+=3){let M=g,C=g+1,S=g+2;s=ca(this,a,e,i,c,u,d,M,C,S),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}}};function Np(n,e,t,i,s,r,a,o){let l;if(e.side===Jt?l=i.intersectTriangle(a,r,s,!0,o):l=i.intersectTriangle(s,r,a,e.side===Mi,o),l===null)return null;la.copy(o),la.applyMatrix4(n.matrixWorld);let c=t.ray.origin.distanceTo(la);return c<t.near||c>t.far?null:{distance:c,point:la.clone(),object:n}}function ca(n,e,t,i,s,r,a,o,l,c){n.getVertexPosition(o,sa),n.getVertexPosition(l,ra),n.getVertexPosition(c,aa);let u=Np(n,e,t,i,sa,ra,aa,yh);if(u){let d=new U;Jn.getBarycoord(yh,sa,ra,aa,d),s&&(u.uv=Jn.getInterpolatedAttribute(s,o,l,c,d,new Be)),r&&(u.uv1=Jn.getInterpolatedAttribute(r,o,l,c,d,new Be)),a&&(u.normal=Jn.getInterpolatedAttribute(a,o,l,c,d,new U),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));let h={a:o,b:l,c,normal:new U,materialIndex:0};Jn.getNormal(sa,ra,aa,h.normal),u.face=h,u.barycoord=d}return u}var Da=class extends tn{constructor(e=null,t=1,i=1,s,r,a,o,l,c=Ot,u=Ot,d,h){super(null,a,o,l,c,u,s,r,d,h),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Fi=new ki,Dp=new Be(.5,.5),ua=new U,Ss=class{constructor(e=new dn,t=new dn,i=new dn,s=new dn,r=new dn,a=new dn){this.planes=[e,t,i,s,r,a]}set(e,t,i,s,r,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){let t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Tn,i=!1){let s=this.planes,r=e.elements,a=r[0],o=r[1],l=r[2],c=r[3],u=r[4],d=r[5],h=r[6],p=r[7],m=r[8],y=r[9],g=r[10],f=r[11],M=r[12],C=r[13],S=r[14],E=r[15];if(s[0].setComponents(c-a,p-u,f-m,E-M).normalize(),s[1].setComponents(c+a,p+u,f+m,E+M).normalize(),s[2].setComponents(c+o,p+d,f+y,E+C).normalize(),s[3].setComponents(c-o,p-d,f-y,E-C).normalize(),i)s[4].setComponents(l,h,g,S).normalize(),s[5].setComponents(c-l,p-h,f-g,E-S).normalize();else if(s[4].setComponents(c-l,p-h,f-g,E-S).normalize(),t===Tn)s[5].setComponents(c+l,p+h,f+g,E+S).normalize();else if(t===_s)s[5].setComponents(l,h,g,S).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Fi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Fi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Fi)}intersectsSprite(e){Fi.center.set(0,0,0);let t=Dp.distanceTo(e.center);return Fi.radius=.7071067811865476+t,Fi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Fi)}intersectsSphere(e){let t=this.planes,i=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let i=0;i<6;i++){let s=t[i];if(ua.x=s.normal.x>0?e.max.x:e.min.x,ua.y=s.normal.y>0?e.max.y:e.min.y,ua.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(ua)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Ms=class extends ei{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new tt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},La=new U,Ua=new U,bh=new Et,Zs=new Bi,ha=new ki,tc=new U,Sh=new U,Fa=class extends zt{constructor(e=new $t,t=new Ms){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,i=[0];for(let s=1,r=t.count;s<r;s++)La.fromBufferAttribute(t,s-1),Ua.fromBufferAttribute(t,s),i[s]=i[s-1],i[s]+=La.distanceTo(Ua);e.setAttribute("lineDistance",new Ft(i,1))}else Ue("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let i=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),ha.copy(i.boundingSphere),ha.applyMatrix4(s),ha.radius+=r,e.ray.intersectsSphere(ha)===!1)return;bh.copy(s).invert(),Zs.copy(e.ray).applyMatrix4(bh);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,u=i.index,h=i.attributes.position;if(u!==null){let p=Math.max(0,a.start),m=Math.min(u.count,a.start+a.count);for(let y=p,g=m-1;y<g;y+=c){let f=u.getX(y),M=u.getX(y+1),C=da(this,e,Zs,l,f,M,y);C&&t.push(C)}if(this.isLineLoop){let y=u.getX(m-1),g=u.getX(p),f=da(this,e,Zs,l,y,g,m-1);f&&t.push(f)}}else{let p=Math.max(0,a.start),m=Math.min(h.count,a.start+a.count);for(let y=p,g=m-1;y<g;y+=c){let f=da(this,e,Zs,l,y,y+1,y);f&&t.push(f)}if(this.isLineLoop){let y=da(this,e,Zs,l,m-1,p,m-1);y&&t.push(y)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function da(n,e,t,i,s,r,a){let o=n.geometry.attributes.position;if(La.fromBufferAttribute(o,s),Ua.fromBufferAttribute(o,r),t.distanceSqToSegment(La,Ua,tc,Sh)>i)return;tc.applyMatrix4(n.matrixWorld);let c=e.ray.origin.distanceTo(tc);if(!(c<e.near||c>e.far))return{distance:c,point:Sh.clone().applyMatrix4(n.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:n}}var Mh=new U,Eh=new U,or=class extends Fa{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,i=[];for(let s=0,r=t.count;s<r;s+=2)Mh.fromBufferAttribute(t,s),Eh.fromBufferAttribute(t,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+Mh.distanceTo(Eh);e.setAttribute("lineDistance",new Ft(i,1))}else Ue("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var lr=class extends tn{constructor(e=[],t=Ei,i,s,r,a,o,l,c,u){super(e,t,i,s,r,a,o,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}};var mi=class extends tn{constructor(e,t,i=Rn,s,r,a,o=Ot,l=Ot,c,u=Bn,d=1){if(u!==Bn&&u!==wi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let h={width:e,height:t,depth:d};super(h,s,r,a,o,l,u,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new ys(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},Oa=class extends mi{constructor(e,t=Rn,i=Ei,s,r,a=Ot,o=Ot,l,c=Bn){let u={width:e,height:e,depth:1},d=[u,u,u,u,u,u];super(e,e,t,i,s,r,a,o,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},cr=class extends tn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},gi=class n extends $t{constructor(e=1,t=1,i=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let l=[],c=[],u=[],d=[],h=0,p=0;m("z","y","x",-1,-1,i,t,e,a,r,0),m("z","y","x",1,-1,i,t,-e,a,r,1),m("x","z","y",1,1,e,i,t,s,a,2),m("x","z","y",1,-1,e,i,-t,s,a,3),m("x","y","z",1,-1,e,t,i,s,r,4),m("x","y","z",-1,-1,e,t,-i,s,r,5),this.setIndex(l),this.setAttribute("position",new Ft(c,3)),this.setAttribute("normal",new Ft(u,3)),this.setAttribute("uv",new Ft(d,2));function m(y,g,f,M,C,S,E,w,I,v,R){let D=S/I,O=E/v,P=S/2,X=E/2,b=w/2,T=I+1,k=v+1,V=0,re=0,Z=new U;for(let ne=0;ne<k;ne++){let se=ne*O-X;for(let De=0;De<T;De++){let Re=De*D-P;Z[y]=Re*M,Z[g]=se*C,Z[f]=b,c.push(Z.x,Z.y,Z.z),Z[y]=0,Z[g]=0,Z[f]=w>0?1:-1,u.push(Z.x,Z.y,Z.z),d.push(De/I),d.push(1-ne/v),V+=1}}for(let ne=0;ne<v;ne++)for(let se=0;se<I;se++){let De=h+se+T*ne,Re=h+se+T*(ne+1),mt=h+(se+1)+T*(ne+1),nt=h+(se+1)+T*ne;l.push(De,Re,nt),l.push(Re,mt,nt),re+=6}o.addGroup(p,re,R),p+=re,h+=V}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var ur=class n extends $t{constructor(e=1,t=1,i=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let u=[],d=[],h=[],p=[],m=0,y=[],g=i/2,f=0;M(),a===!1&&(e>0&&C(!0),t>0&&C(!1)),this.setIndex(u),this.setAttribute("position",new Ft(d,3)),this.setAttribute("normal",new Ft(h,3)),this.setAttribute("uv",new Ft(p,2));function M(){let S=new U,E=new U,w=0,I=(t-e)/i;for(let v=0;v<=r;v++){let R=[],D=v/r,O=D*(t-e)+e;for(let P=0;P<=s;P++){let X=P/s,b=X*l+o,T=Math.sin(b),k=Math.cos(b);E.x=O*T,E.y=-D*i+g,E.z=O*k,d.push(E.x,E.y,E.z),S.set(T,I,k).normalize(),h.push(S.x,S.y,S.z),p.push(X,1-D),R.push(m++)}y.push(R)}for(let v=0;v<s;v++)for(let R=0;R<r;R++){let D=y[R][v],O=y[R+1][v],P=y[R+1][v+1],X=y[R][v+1];(e>0||R!==0)&&(u.push(D,O,X),w+=3),(t>0||R!==r-1)&&(u.push(O,P,X),w+=3)}c.addGroup(f,w,0),f+=w}function C(S){let E=m,w=new Be,I=new U,v=0,R=S===!0?e:t,D=S===!0?1:-1;for(let P=1;P<=s;P++)d.push(0,g*D,0),h.push(0,D,0),p.push(.5,.5),m++;let O=m;for(let P=0;P<=s;P++){let b=P/s*l+o,T=Math.cos(b),k=Math.sin(b);I.x=R*k,I.y=g*D,I.z=R*T,d.push(I.x,I.y,I.z),h.push(0,D,0),w.x=T*.5+.5,w.y=k*.5*D+.5,p.push(w.x,w.y),m++}for(let P=0;P<s;P++){let X=E+P,b=O+P;S===!0?u.push(b,b+1,X):u.push(b+1,b,X),v+=3}c.addGroup(f,v,S===!0?1:2),f+=v}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var fa=new U,pa=new U,nc=new U,ma=new Jn,hr=class extends $t{constructor(e=null,t=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:e,thresholdAngle:t},e!==null){let s=Math.pow(10,4),r=Math.cos(ps*t),a=e.getIndex(),o=e.getAttribute("position"),l=a?a.count:o.count,c=[0,0,0],u=["a","b","c"],d=new Array(3),h={},p=[];for(let m=0;m<l;m+=3){a?(c[0]=a.getX(m),c[1]=a.getX(m+1),c[2]=a.getX(m+2)):(c[0]=m,c[1]=m+1,c[2]=m+2);let{a:y,b:g,c:f}=ma;if(y.fromBufferAttribute(o,c[0]),g.fromBufferAttribute(o,c[1]),f.fromBufferAttribute(o,c[2]),ma.getNormal(nc),d[0]=`${Math.round(y.x*s)},${Math.round(y.y*s)},${Math.round(y.z*s)}`,d[1]=`${Math.round(g.x*s)},${Math.round(g.y*s)},${Math.round(g.z*s)}`,d[2]=`${Math.round(f.x*s)},${Math.round(f.y*s)},${Math.round(f.z*s)}`,!(d[0]===d[1]||d[1]===d[2]||d[2]===d[0]))for(let M=0;M<3;M++){let C=(M+1)%3,S=d[M],E=d[C],w=ma[u[M]],I=ma[u[C]],v=`${S}_${E}`,R=`${E}_${S}`;R in h&&h[R]?(nc.dot(h[R].normal)<=r&&(p.push(w.x,w.y,w.z),p.push(I.x,I.y,I.z)),h[R]=null):v in h||(h[v]={index0:c[M],index1:c[C],normal:nc.clone()})}}for(let m in h)if(h[m]){let{index0:y,index1:g}=h[m];fa.fromBufferAttribute(o,y),pa.fromBufferAttribute(o,g),p.push(fa.x,fa.y,fa.z),p.push(pa.x,pa.y,pa.z)}this.setAttribute("position",new Ft(p,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}};var dr=class n extends $t{constructor(e=1,t=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:s};let r=e/2,a=t/2,o=Math.floor(i),l=Math.floor(s),c=o+1,u=l+1,d=e/o,h=t/l,p=[],m=[],y=[],g=[];for(let f=0;f<u;f++){let M=f*h-a;for(let C=0;C<c;C++){let S=C*d-r;m.push(S,-M,0),y.push(0,0,1),g.push(C/o),g.push(1-f/l)}}for(let f=0;f<l;f++)for(let M=0;M<o;M++){let C=M+c*f,S=M+c*(f+1),E=M+1+c*(f+1),w=M+1+c*f;p.push(C,S,w),p.push(S,E,w)}this.setIndex(p),this.setAttribute("position",new Ft(m,3)),this.setAttribute("normal",new Ft(y,3)),this.setAttribute("uv",new Ft(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.widthSegments,e.heightSegments)}};function Hi(n){let e={};for(let t in n){e[t]={};for(let i in n[t]){let s=n[t][i];if(Th(s))s.isRenderTargetTexture?(Ue("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=s.clone();else if(Array.isArray(s))if(Th(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();e[t][i]=r}else e[t][i]=s.slice();else e[t][i]=s}}return e}function Yt(n){let e={};for(let t=0;t<n.length;t++){let i=Hi(n[t]);for(let s in i)e[s]=i[s]}return e}function Th(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function Lp(n){let e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function Oc(n){let e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:ot.workingColorSpace}var gd={clone:Hi,merge:Yt},Up=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Fp=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,pn=class extends ei{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Up,this.fragmentShader=Fp,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Hi(e.uniforms),this.uniformsGroups=Lp(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let i={};for(let s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let i in e.uniforms){let s=e.uniforms[i];switch(this.uniforms[i]={},s.type){case"t":this.uniforms[i].value=t[s.value]||null;break;case"c":this.uniforms[i].value=new tt().setHex(s.value);break;case"v2":this.uniforms[i].value=new Be().fromArray(s.value);break;case"v3":this.uniforms[i].value=new U().fromArray(s.value);break;case"v4":this.uniforms[i].value=new Tt().fromArray(s.value);break;case"m3":this.uniforms[i].value=new Ve().fromArray(s.value);break;case"m4":this.uniforms[i].value=new Et().fromArray(s.value);break;default:this.uniforms[i].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let i in e.extensions)this.extensions[i]=e.extensions[i];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},ka=class extends pn{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},_i=class extends ei{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new tt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new tt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=zo,this.normalScale=new Be(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Qn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}};var Ba=class extends ei{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=td,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},za=class extends ei{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function us(n,e){return!n||n.constructor===e?n:typeof e.BYTES_PER_ELEMENT=="number"?new e(n):Array.prototype.slice.call(n)}function ic(n){return n!==void 0&&n.inTangents!==void 0&&n.outTangents!==void 0}var vi=class{constructor(e,t,i,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(i),this.sampleValues=t,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,i=this._cachedIndex,s=t[i],r=t[i-1];n:{e:{let a;t:{i:if(!(e<s)){for(let o=i+2;;){if(s===void 0){if(e<r)break i;return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===o)break;if(r=s,s=t[++i],e<s)break e}a=t.length;break t}if(!(e>=r)){let o=t[1];e<o&&(i=2,r=o);for(let l=i-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(s=r,r=t[--i-1],e>=r)break e}a=i,i=0;break t}break n}for(;i<a;){let o=i+a>>>1;e<t[o]?a=o:i=o+1}if(s=t[i],r=t[i-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,r,s)}return this.interpolate_(i,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,i=this.sampleValues,s=this.valueSize,r=e*s;for(let a=0;a!==s;++a)t[a]=i[r+a];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Va=class extends vi{constructor(e,t,i,s){super(e,t,i,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ac,endingEnd:ac}}intervalChanged_(e,t,i){let s=this.parameterPositions,r=e-2,a=e+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case oc:r=e,o=2*t-i;break;case lc:r=s.length-2,o=t+s[r]-s[r+1];break;default:r=e,o=i}if(l===void 0)switch(this.getSettings_().endingEnd){case oc:a=e,l=2*i-t;break;case lc:a=1,l=i+s[1]-s[0];break;default:a=e-1,l=t}let c=(i-t)*.5,u=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-i),this._offsetPrev=r*u,this._offsetNext=a*u}interpolate_(e,t,i,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=this._offsetPrev,d=this._offsetNext,h=this._weightPrev,p=this._weightNext,m=(i-t)/(s-t),y=m*m,g=y*m,f=-h*g+2*h*y-h*m,M=(1+h)*g+(-1.5-2*h)*y+(-.5+h)*m+1,C=(-1-p)*g+(1.5+p)*y+.5*m,S=p*g-p*y;for(let E=0;E!==o;++E)r[E]=f*a[u+E]+M*a[c+E]+C*a[l+E]+S*a[d+E];return r}},Ha=class extends vi{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=(i-t)/(s-t),d=1-u;for(let h=0;h!==o;++h)r[h]=a[c+h]*d+a[l+h]*u;return r}},Ga=class extends vi{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e){return this.copySampleValue_(e-1)}},Wa=class extends vi{interpolate_(e,t,i,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=this.inTangents,d=this.outTangents;if(!u||!d){let m=(i-t)/(s-t),y=1-m;for(let g=0;g!==o;++g)r[g]=a[c+g]*y+a[l+g]*m;return r}let h=o*2,p=e-1;for(let m=0;m!==o;++m){let y=a[c+m],g=a[l+m],f=p*h+m*2,M=d[f],C=d[f+1],S=e*h+m*2,E=u[S],w=u[S+1],I=kp(i,t,M,E,s);r[m]=_d(I,y,C,w,g)}return r}};function _d(n,e,t,i,s){let r=1-n;return r*r*r*e+3*r*r*n*t+3*r*n*n*i+n*n*n*s}function Op(n,e,t,i,s){let r=1-n;return 3*r*r*(t-e)+6*r*n*(i-t)+3*n*n*(s-i)}function kp(n,e,t,i,s){let r=(n-e)/(s-e);for(let a=0;a<8;a++){let o=_d(r,e,t,i,s)-n;if(Math.abs(o)<1e-10)break;let l=Op(r,e,t,i,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-o/l))}return r}var mn=class{constructor(e,t,i,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=us(t,this.TimeBufferType),this.values=us(i,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,i;if(t.toJSON!==this.toJSON)i=t.toJSON(e);else{i={name:e.name,times:us(e.times,Array),values:us(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(i.interpolation=s),ic(e.settings)&&(i.settings={inTangents:us(e.settings.inTangents,Array),outTangents:us(e.settings.outTangents,Array)})}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new Ga(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Ha(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Va(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Wa(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Js:t=this.InterpolantFactoryMethodDiscrete;break;case Ca:t=this.InterpolantFactoryMethodLinear;break;case va:t=this.InterpolantFactoryMethodSmooth;break;case rc:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return Ue("KeyframeTrack:",i),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Js;case this.InterpolantFactoryMethodLinear:return Ca;case this.InterpolantFactoryMethodSmooth:return va;case this.InterpolantFactoryMethodBezier:return rc}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]*=e;ic(this.settings)&&(wh(this.settings.inTangents,e),wh(this.settings.outTangents,e))}return this}trim(e,t){let i=this.times,s=i.length,r=0,a=s-1;for(;r!==s&&i[r]<e;)++r;for(;a!==-1&&i[a]>t;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=i.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(ke("KeyframeTrack: Invalid value size in track.",this),e=!1);let i=this.times,s=this.values,r=i.length;r===0&&(ke("KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==r;o++){let l=i[o];if(typeof l=="number"&&isNaN(l)){ke("KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(a!==null&&a>l){ke("KeyframeTrack: Out of order keys.",this,o,l,a),e=!1;break}a=l}if(s!==void 0&&Qf(s))for(let o=0,l=s.length;o!==l;++o){let c=s[o];if(isNaN(c)){ke("KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),i=this.getValueSize(),s=this.getInterpolation()===va,r=e.length-1,a=1;for(let o=1;o<r;++o){let l=!1,c=e[o],u=e[o+1];if(c!==u&&(o!==1||c!==e[0]))if(s)l=!0;else{let d=o*i,h=d-i,p=d+i;for(let m=0;m!==i;++m){let y=t[d+m];if(y!==t[h+m]||y!==t[p+m]){l=!0;break}}}if(l){if(o!==a){e[a]=e[o];let d=o*i,h=a*i;for(let p=0;p!==i;++p)t[h+p]=t[d+p]}++a}}if(r>0){e[a]=e[r];for(let o=r*i,l=a*i,c=0;c!==i;++c)t[l+c]=t[o+c];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*i)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),i=this.constructor,s=new i(this.name,e,t);return s.createInterpolant=this.createInterpolant,ic(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function wh(n,e){for(let t=0,i=n.length;t!==i;t+=2)n[t]*=e}mn.prototype.ValueTypeName="";mn.prototype.TimeBufferType=Float32Array;mn.prototype.ValueBufferType=Float32Array;mn.prototype.DefaultInterpolation=Ca;var xi=class extends mn{constructor(e,t,i){super(e,t,i)}};xi.prototype.ValueTypeName="bool";xi.prototype.ValueBufferType=Array;xi.prototype.DefaultInterpolation=Js;xi.prototype.InterpolantFactoryMethodLinear=void 0;xi.prototype.InterpolantFactoryMethodSmooth=void 0;var Xa=class extends mn{constructor(e,t,i,s){super(e,t,i,s)}};Xa.prototype.ValueTypeName="color";var qa=class extends mn{constructor(e,t,i,s){super(e,t,i,s)}};qa.prototype.ValueTypeName="number";var $a=class extends vi{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(i-t)/(s-t),c=e*o;for(let u=c+o;c!==u;c+=4)fn.slerpFlat(r,0,a,c-o,a,c,l);return r}},fr=class extends mn{constructor(e,t,i,s){super(e,t,i,s)}InterpolantFactoryMethodLinear(e){return new $a(this.times,this.values,this.getValueSize(),e)}};fr.prototype.ValueTypeName="quaternion";fr.prototype.InterpolantFactoryMethodSmooth=void 0;var yi=class extends mn{constructor(e,t,i){super(e,t,i)}};yi.prototype.ValueTypeName="string";yi.prototype.ValueBufferType=Array;yi.prototype.DefaultInterpolation=Js;yi.prototype.InterpolantFactoryMethodLinear=void 0;yi.prototype.InterpolantFactoryMethodSmooth=void 0;var Ya=class extends mn{constructor(e,t,i,s){super(e,t,i,s)}};Ya.prototype.ValueTypeName="vector";var Za=class{constructor(e,t,i){let s=this,r=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this._abortController=null,this.itemStart=function(u){o++,r===!1&&s.onStart!==void 0&&s.onStart(u,a,o),r=!0},this.itemEnd=function(u){a++,s.onProgress!==void 0&&s.onProgress(u,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(u){s.onError!==void 0&&s.onError(u)},this.resolveURL=function(u){return u=u.normalize("NFC"),l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,d){return c.push(u,d),this},this.removeHandler=function(u){let d=c.indexOf(u);return d!==-1&&c.splice(d,2),this},this.getHandler=function(u){for(let d=0,h=c.length;d<h;d+=2){let p=c[d],m=c[d+1];if(p.global&&(p.lastIndex=0),p.test(u))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},vd=new Za,Ka=class{constructor(e){this.manager=e!==void 0?e:vd,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let i=this;return new Promise(function(s,r){i.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Ka.DEFAULT_MATERIAL_NAME="__DEFAULT";var Es=class extends zt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new tt(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},pr=class extends Es{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(zt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new tt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},sc=new Et,Ah=new U,Rh=new U,Ja=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Be(512,512),this.mapType=sn,this.map=null,this.mapPass=null,this.matrix=new Et,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ss,this._frameExtents=new Be(1,1),this._viewportCount=1,this._viewports=[new Tt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera;Ah.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ah),Rh.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Rh),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,i,s){sc.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),i.setFromProjectionMatrix(sc,e.coordinateSystem,e.reversedDepth);let r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;e.coordinateSystem===_s||e.reversedDepth?t.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):t.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),t.multiply(sc)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},ga=new U,_a=new fn,On=new U,mr=class extends zt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Et,this.projectionMatrix=new Et,this.projectionMatrixInverse=new Et,this.coordinateSystem=Tn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(ga,_a,On),On.x===1&&On.y===1&&On.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ga,_a,On.set(1,1,1)).invert()}updateWorldMatrix(e,t,i=!1){super.updateWorldMatrix(e,t,i),this.matrixWorld.decompose(ga,_a,On),On.x===1&&On.y===1&&On.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ga,_a,On.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},pi=new U,Ch=new Be,Ih=new Be,qt=class extends mr{constructor(e=50,t=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=xs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(ps*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return xs*2*Math.atan(Math.tan(ps*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){pi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(pi.x,pi.y).multiplyScalar(-e/pi.z),pi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(pi.x,pi.y).multiplyScalar(-e/pi.z)}getViewSize(e,t){return this.getViewBounds(e,Ch,Ih),t.subVectors(Ih,Ch)}setViewOffset(e,t,i,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(ps*.5*this.fov)/this.zoom,i=2*t,s=this.aspect*i,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,t-=a.offsetY*i/c,s*=a.width/l,i*=a.height/c}let o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var Ts=class extends mr{constructor(e=-1,t=1,i=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=i-e,a=i+e,o=s+t,l=s-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=u*this.view.offsetY,l=o-u*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},cc=class extends Ja{constructor(){super(new Ts(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},ws=class extends Es{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(zt.DEFAULT_UP),this.updateMatrix(),this.target=new zt,this.shadow=new cc}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},gr=class extends Es{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}};var hs=-90,ds=1,ja=class extends zt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new qt(hs,ds,e,t);s.layers=this.layers,this.add(s);let r=new qt(hs,ds,e,t);r.layers=this.layers,this.add(r);let a=new qt(hs,ds,e,t);a.layers=this.layers,this.add(a);let o=new qt(hs,ds,e,t);o.layers=this.layers,this.add(o);let l=new qt(hs,ds,e,t);l.layers=this.layers,this.add(l);let c=new qt(hs,ds,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[i,s,r,a,o,l]=t;for(let c of t)this.remove(c);if(e===Tn)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===_s)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,l,c,u]=this.children,d=e.getRenderTarget(),h=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;let y=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let g=!1;e.isWebGLRenderer===!0?g=e.state.buffers.depth.getReversed():g=e.reversedDepthBuffer,e.setRenderTarget(i,0,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(i,1,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(i,2,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(i,3,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(i,4,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),i.texture.generateMipmaps=y,e.setRenderTarget(i,5,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(d,h,p),e.xr.enabled=m,i.texture.needsPMREMUpdate=!0}},Qa=class extends qt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var kc="\\[\\]\\.:\\/",Bp=new RegExp("["+kc+"]","g"),Bc="[^"+kc+"]",zp="[^"+kc.replace("\\.","")+"]",Vp=/((?:WC+[\/:])*)/.source.replace("WC",Bc),Hp=/(WCOD+)?/.source.replace("WCOD",zp),Gp=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Bc),Wp=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Bc),Xp=new RegExp("^"+Vp+Hp+Gp+Wp+"$"),qp=["material","materials","bones","map"],uc=class{constructor(e,t,i){let s=i||St.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let i=this._targetGroup.nCachedObjects_,s=this._bindings[i];s!==void 0&&s.getValue(e,t)}setValue(e,t){let i=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=i.length;s!==r;++s)i[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}},St=class n{constructor(e,t,i){this.path=t,this.parsedPath=i||n.parseTrackName(t),this.node=n.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new n.Composite(e,t,i):new n(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Bp,"")}static parseTrackName(e){let t=Xp.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=i.nodeName&&i.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=i.nodeName.substring(s+1);qp.indexOf(r)!==-1&&(i.nodeName=i.nodeName.substring(0,s),i.objectName=r)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){let i=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===t||o.uuid===t)return o;let l=i(o.children);if(l)return l}return null},s=i(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)e[t++]=i[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,i=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=n.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Ue("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=t.objectIndex;switch(i){case"materials":if(!e.material){ke("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){ke("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){ke("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){ke("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){ke("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){ke("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(c!==void 0){if(e[c]===void 0){ke("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let a=e[s];if(a===void 0){let c=t.nodeName;ke("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){ke("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){ke("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};St.Composite=uc;St.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};St.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};St.prototype.GetterByBindingType=[St.prototype._getValue_direct,St.prototype._getValue_array,St.prototype._getValue_arrayElement,St.prototype._getValue_toArray];St.prototype.SetterByBindingTypeAndVersioning=[[St.prototype._setValue_direct,St.prototype._setValue_direct_setNeedsUpdate,St.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[St.prototype._setValue_array,St.prototype._setValue_array_setNeedsUpdate,St.prototype._setValue_array_setMatrixWorldNeedsUpdate],[St.prototype._setValue_arrayElement,St.prototype._setValue_arrayElement_setNeedsUpdate,St.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[St.prototype._setValue_fromArray,St.prototype._setValue_fromArray_setNeedsUpdate,St.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Wx=new Float32Array(1);var As=class{constructor(e=1,t=0,i=0){this.radius=e,this.phi=t,this.theta=i}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=et(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(et(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var hc=class n{static{n.prototype.isMatrix2=!0}constructor(e,t,i,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,i,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let i=0;i<4;i++)this.elements[i]=e[i+t];return this}set(e,t,i,s){let r=this.elements;return r[0]=e,r[2]=t,r[1]=i,r[3]=s,this}};var _r=class extends wn{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}};function zc(n,e,t,i){let s=$p(i);switch(t){case Pc:return n*e;case Dc:return n*e/s.components*s.byteLength;case ao:return n*e/s.components*s.byteLength;case Ai:return n*e*2/s.components*s.byteLength;case oo:return n*e*2/s.components*s.byteLength;case Nc:return n*e*3/s.components*s.byteLength;case yn:return n*e*4/s.components*s.byteLength;case lo:return n*e*4/s.components*s.byteLength;case br:case Sr:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Mr:case Er:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case uo:case fo:return Math.max(n,16)*Math.max(e,8)/4;case co:case ho:return Math.max(n,8)*Math.max(e,8)/2;case po:case mo:case _o:case vo:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case go:case Tr:case xo:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case yo:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case bo:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case So:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Mo:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case Eo:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case To:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case wo:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case Ao:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case Ro:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case Co:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case Io:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case Po:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case No:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case Do:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case Lo:case Uo:case Fo:return Math.ceil(n/4)*Math.ceil(e/4)*16;case Oo:case ko:return Math.ceil(n/4)*Math.ceil(e/4)*8;case wr:case Bo:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function $p(n){switch(n){case sn:case Ac:return{byteLength:1,components:1};case Is:case Rc:case In:return{byteLength:2,components:1};case so:case ro:return{byteLength:2,components:4};case Rn:case io:case Cn:return{byteLength:4,components:1};case Cc:case Ic:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Ue("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function zd(){let n=null,e=!1,t=null,i=null;function s(r,a){i=n.requestAnimationFrame(s),t(r,a)}return{start:function(){e!==!0&&t!==null&&n!==null&&(i=n.requestAnimationFrame(s),e=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){n=r}}}function Zp(n){let e=new WeakMap;function t(o,l){let c=o.array,u=o.usage,d=c.byteLength,h=n.createBuffer();n.bindBuffer(l,h),n.bufferData(l,c,u),o.onUploadCallback();let p;if(c instanceof Float32Array)p=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)p=n.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?p=n.HALF_FLOAT:p=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=n.SHORT;else if(c instanceof Uint32Array)p=n.UNSIGNED_INT;else if(c instanceof Int32Array)p=n.INT;else if(c instanceof Int8Array)p=n.BYTE;else if(c instanceof Uint8Array)p=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function i(o,l,c){let u=l.array,d=l.updateRanges;if(n.bindBuffer(c,o),d.length===0)n.bufferSubData(c,0,u);else{d.sort((p,m)=>p.start-m.start);let h=0;for(let p=1;p<d.length;p++){let m=d[h],y=d[p];y.start<=m.start+m.count+1?m.count=Math.max(m.count,y.start+y.count-m.start):(++h,d[h]=y)}d.length=h+1;for(let p=0,m=d.length;p<m;p++){let y=d[p];n.bufferSubData(c,y.start*u.BYTES_PER_ELEMENT,u,y.start,y.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=e.get(o);l&&(n.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let u=e.get(o);(!u||u.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var Kp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Jp=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,jp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Qp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,em=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,tm=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,nm=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,im=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,sm=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,rm=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,am=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,om=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,lm=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,cm=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,um=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,hm=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,dm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,fm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,pm=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,mm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,gm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,_m=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,vm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,xm=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,ym=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,bm=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Sm=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Mm=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Em=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Tm=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,wm="gl_FragColor = linearToOutputTexel( gl_FragColor );",Am=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Rm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Cm=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Im=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Pm=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Nm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Dm=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Lm=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Um=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Fm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Om=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,km=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Bm=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,zm=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Vm=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Hm=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,Gm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Wm=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Xm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,qm=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,$m=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Ym=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Zm=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Km=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Jm=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,jm=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Qm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,eg=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,tg=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ng=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,ig=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,sg=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,rg=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,ag=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,og=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,lg=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,cg=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,ug=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,hg=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,dg=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,fg=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,pg=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,mg=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,gg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,_g=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,vg=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,xg=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,yg=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,bg=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Sg=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Mg=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Eg=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Tg=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,wg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ag=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Rg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Cg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Ig=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Pg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Ng=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Dg=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Lg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Ug=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Fg=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Og=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,kg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Bg=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,zg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Vg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Hg=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Gg=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Wg=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Xg=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,qg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,$g=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Yg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Zg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Kg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Jg=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,jg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Qg=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,e_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,t_=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,n_=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,i_=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,s_=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,r_=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,a_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,o_=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,l_=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,c_=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,u_=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,h_=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,d_=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,f_=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,p_=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,m_=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,g_=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,__=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,v_=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,x_=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,y_=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,b_=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,S_=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,M_=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,E_=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,T_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,w_=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,A_=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,R_=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,C_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,je={alphahash_fragment:Kp,alphahash_pars_fragment:Jp,alphamap_fragment:jp,alphamap_pars_fragment:Qp,alphatest_fragment:em,alphatest_pars_fragment:tm,aomap_fragment:nm,aomap_pars_fragment:im,batching_pars_vertex:sm,batching_vertex:rm,begin_vertex:am,beginnormal_vertex:om,bsdfs:lm,iridescence_fragment:cm,bumpmap_pars_fragment:um,clipping_planes_fragment:hm,clipping_planes_pars_fragment:dm,clipping_planes_pars_vertex:fm,clipping_planes_vertex:pm,color_fragment:mm,color_pars_fragment:gm,color_pars_vertex:_m,color_vertex:vm,common:xm,cube_uv_reflection_fragment:ym,defaultnormal_vertex:bm,displacementmap_pars_vertex:Sm,displacementmap_vertex:Mm,emissivemap_fragment:Em,emissivemap_pars_fragment:Tm,colorspace_fragment:wm,colorspace_pars_fragment:Am,envmap_fragment:Rm,envmap_common_pars_fragment:Cm,envmap_pars_fragment:Im,envmap_pars_vertex:Pm,envmap_physical_pars_fragment:Hm,envmap_vertex:Nm,fog_vertex:Dm,fog_pars_vertex:Lm,fog_fragment:Um,fog_pars_fragment:Fm,gradientmap_pars_fragment:Om,lightmap_pars_fragment:km,lights_lambert_fragment:Bm,lights_lambert_pars_fragment:zm,lights_pars_begin:Vm,lights_toon_fragment:Gm,lights_toon_pars_fragment:Wm,lights_phong_fragment:Xm,lights_phong_pars_fragment:qm,lights_physical_fragment:$m,lights_physical_pars_fragment:Ym,lights_fragment_begin:Zm,lights_fragment_maps:Km,lights_fragment_end:Jm,lightprobes_pars_fragment:jm,logdepthbuf_fragment:Qm,logdepthbuf_pars_fragment:eg,logdepthbuf_pars_vertex:tg,logdepthbuf_vertex:ng,map_fragment:ig,map_pars_fragment:sg,map_particle_fragment:rg,map_particle_pars_fragment:ag,metalnessmap_fragment:og,metalnessmap_pars_fragment:lg,morphinstance_vertex:cg,morphcolor_vertex:ug,morphnormal_vertex:hg,morphtarget_pars_vertex:dg,morphtarget_vertex:fg,normal_fragment_begin:pg,normal_fragment_maps:mg,normal_pars_fragment:gg,normal_pars_vertex:_g,normal_vertex:vg,normalmap_pars_fragment:xg,clearcoat_normal_fragment_begin:yg,clearcoat_normal_fragment_maps:bg,clearcoat_pars_fragment:Sg,iridescence_pars_fragment:Mg,opaque_fragment:Eg,packing:Tg,premultiplied_alpha_fragment:wg,project_vertex:Ag,dithering_fragment:Rg,dithering_pars_fragment:Cg,roughnessmap_fragment:Ig,roughnessmap_pars_fragment:Pg,shadowmap_pars_fragment:Ng,shadowmap_pars_vertex:Dg,shadowmap_vertex:Lg,shadowmask_pars_fragment:Ug,skinbase_vertex:Fg,skinning_pars_vertex:Og,skinning_vertex:kg,skinnormal_vertex:Bg,specularmap_fragment:zg,specularmap_pars_fragment:Vg,tonemapping_fragment:Hg,tonemapping_pars_fragment:Gg,transmission_fragment:Wg,transmission_pars_fragment:Xg,uv_pars_fragment:qg,uv_pars_vertex:$g,uv_vertex:Yg,worldpos_vertex:Zg,background_vert:Kg,background_frag:Jg,backgroundCube_vert:jg,backgroundCube_frag:Qg,cube_vert:e_,cube_frag:t_,depth_vert:n_,depth_frag:i_,distance_vert:s_,distance_frag:r_,equirect_vert:a_,equirect_frag:o_,linedashed_vert:l_,linedashed_frag:c_,meshbasic_vert:u_,meshbasic_frag:h_,meshlambert_vert:d_,meshlambert_frag:f_,meshmatcap_vert:p_,meshmatcap_frag:m_,meshnormal_vert:g_,meshnormal_frag:__,meshphong_vert:v_,meshphong_frag:x_,meshphysical_vert:y_,meshphysical_frag:b_,meshtoon_vert:S_,meshtoon_frag:M_,points_vert:E_,points_frag:T_,shadow_vert:w_,shadow_frag:A_,sprite_vert:R_,sprite_frag:C_},ge={common:{diffuse:{value:new tt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ve},alphaMap:{value:null},alphaMapTransform:{value:new Ve},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ve}},envmap:{envMap:{value:null},envMapRotation:{value:new Ve},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ve}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ve}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ve},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ve},normalScale:{value:new Be(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ve},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ve}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ve}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ve}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new tt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new U},probesMax:{value:new U},probesResolution:{value:new U}},points:{diffuse:{value:new tt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ve},alphaTest:{value:0},uvTransform:{value:new Ve}},sprite:{diffuse:{value:new tt(16777215)},opacity:{value:1},center:{value:new Be(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ve},alphaMap:{value:null},alphaMapTransform:{value:new Ve},alphaTest:{value:0}}},Hn={basic:{uniforms:Yt([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.fog]),vertexShader:je.meshbasic_vert,fragmentShader:je.meshbasic_frag},lambert:{uniforms:Yt([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new tt(0)},envMapIntensity:{value:1}}]),vertexShader:je.meshlambert_vert,fragmentShader:je.meshlambert_frag},phong:{uniforms:Yt([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new tt(0)},specular:{value:new tt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:je.meshphong_vert,fragmentShader:je.meshphong_frag},standard:{uniforms:Yt([ge.common,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.roughnessmap,ge.metalnessmap,ge.fog,ge.lights,{emissive:{value:new tt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag},toon:{uniforms:Yt([ge.common,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.gradientmap,ge.fog,ge.lights,{emissive:{value:new tt(0)}}]),vertexShader:je.meshtoon_vert,fragmentShader:je.meshtoon_frag},matcap:{uniforms:Yt([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,{matcap:{value:null}}]),vertexShader:je.meshmatcap_vert,fragmentShader:je.meshmatcap_frag},points:{uniforms:Yt([ge.points,ge.fog]),vertexShader:je.points_vert,fragmentShader:je.points_frag},dashed:{uniforms:Yt([ge.common,ge.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:je.linedashed_vert,fragmentShader:je.linedashed_frag},depth:{uniforms:Yt([ge.common,ge.displacementmap]),vertexShader:je.depth_vert,fragmentShader:je.depth_frag},normal:{uniforms:Yt([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,{opacity:{value:1}}]),vertexShader:je.meshnormal_vert,fragmentShader:je.meshnormal_frag},sprite:{uniforms:Yt([ge.sprite,ge.fog]),vertexShader:je.sprite_vert,fragmentShader:je.sprite_frag},background:{uniforms:{uvTransform:{value:new Ve},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:je.background_vert,fragmentShader:je.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ve}},vertexShader:je.backgroundCube_vert,fragmentShader:je.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:je.cube_vert,fragmentShader:je.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:je.equirect_vert,fragmentShader:je.equirect_frag},distance:{uniforms:Yt([ge.common,ge.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:je.distance_vert,fragmentShader:je.distance_frag},shadow:{uniforms:Yt([ge.lights,ge.fog,{color:{value:new tt(0)},opacity:{value:1}}]),vertexShader:je.shadow_vert,fragmentShader:je.shadow_frag}};Hn.physical={uniforms:Yt([Hn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ve},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ve},clearcoatNormalScale:{value:new Be(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ve},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ve},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ve},sheen:{value:0},sheenColor:{value:new tt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ve},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ve},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ve},transmissionSamplerSize:{value:new Be},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ve},attenuationDistance:{value:0},attenuationColor:{value:new tt(0)},specularColor:{value:new tt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ve},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ve},anisotropyVector:{value:new Be},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ve}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag};var Go={r:0,b:0,g:0},I_=new Et,Vd=new Ve;Vd.set(-1,0,0,0,1,0,0,0,1);function P_(n,e,t,i,s,r){let a=new tt(0),o=s===!0?0:1,l,c,u=null,d=0,h=null;function p(M){let C=M.isScene===!0?M.background:null;if(C&&C.isTexture){let S=M.backgroundBlurriness>0;C=e.get(C,S)}return C}function m(M){let C=!1,S=p(M);S===null?g(a,o):S&&S.isColor&&(g(S,1),C=!0);let E=n.xr.getEnvironmentBlendMode();E==="additive"?t.buffers.color.setClear(0,0,0,1,r):E==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(n.autoClear||C)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function y(M,C){let S=p(C);S&&(S.isCubeTexture||S.mapping===xr)?(c===void 0&&(c=new Vt(new gi(1,1,1),new pn({name:"BackgroundCubeMaterial",uniforms:Hi(Hn.backgroundCube.uniforms),vertexShader:Hn.backgroundCube.vertexShader,fragmentShader:Hn.backgroundCube.fragmentShader,side:Jt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(E,w,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),c.material.uniforms.envMap.value=S,c.material.uniforms.backgroundBlurriness.value=C.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(I_.makeRotationFromEuler(C.backgroundRotation)).transpose(),S.isCubeTexture&&S.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Vd),c.material.toneMapped=ot.getTransfer(S.colorSpace)!==dt,(u!==S||d!==S.version||h!==n.toneMapping)&&(c.material.needsUpdate=!0,u=S,d=S.version,h=n.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null)):S&&S.isTexture&&(l===void 0&&(l=new Vt(new dr(2,2),new pn({name:"BackgroundMaterial",uniforms:Hi(Hn.background.uniforms),vertexShader:Hn.background.vertexShader,fragmentShader:Hn.background.fragmentShader,side:Mi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=S,l.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,l.material.toneMapped=ot.getTransfer(S.colorSpace)!==dt,S.matrixAutoUpdate===!0&&S.updateMatrix(),l.material.uniforms.uvTransform.value.copy(S.matrix),(u!==S||d!==S.version||h!==n.toneMapping)&&(l.material.needsUpdate=!0,u=S,d=S.version,h=n.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null))}function g(M,C){M.getRGB(Go,Oc(n)),t.buffers.color.setClear(Go.r,Go.g,Go.b,C,r)}function f(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(M,C=1){a.set(M),o=C,g(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(M){o=M,g(a,o)},render:m,addToRenderList:y,dispose:f}}function N_(n,e){let t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=h(null),r=s,a=!1;function o(O,P,X,b,T){let k=!1,V=d(O,b,X,P);r!==V&&(r=V,c(r.object)),k=p(O,b,X,T),k&&m(O,b,X,T),T!==null&&e.update(T,n.ELEMENT_ARRAY_BUFFER),(k||a)&&(a=!1,S(O,P,X,b),T!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(T).buffer))}function l(){return n.createVertexArray()}function c(O){return n.bindVertexArray(O)}function u(O){return n.deleteVertexArray(O)}function d(O,P,X,b){let T=b.wireframe===!0,k=i[P.id];k===void 0&&(k={},i[P.id]=k);let V=O.isInstancedMesh===!0?O.id:0,re=k[V];re===void 0&&(re={},k[V]=re);let Z=re[X.id];Z===void 0&&(Z={},re[X.id]=Z);let ne=Z[T];return ne===void 0&&(ne=h(l()),Z[T]=ne),ne}function h(O){let P=[],X=[],b=[];for(let T=0;T<t;T++)P[T]=0,X[T]=0,b[T]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:P,enabledAttributes:X,attributeDivisors:b,object:O,attributes:{},index:null}}function p(O,P,X,b){let T=r.attributes,k=P.attributes,V=0,re=X.getAttributes();for(let Z in re)if(re[Z].location>=0){let se=T[Z],De=k[Z];if(De===void 0&&(Z==="instanceMatrix"&&O.instanceMatrix&&(De=O.instanceMatrix),Z==="instanceColor"&&O.instanceColor&&(De=O.instanceColor)),se===void 0||se.attribute!==De||De&&se.data!==De.data)return!0;V++}return r.attributesNum!==V||r.index!==b}function m(O,P,X,b){let T={},k=P.attributes,V=0,re=X.getAttributes();for(let Z in re)if(re[Z].location>=0){let se=k[Z];se===void 0&&(Z==="instanceMatrix"&&O.instanceMatrix&&(se=O.instanceMatrix),Z==="instanceColor"&&O.instanceColor&&(se=O.instanceColor));let De={};De.attribute=se,se&&se.data&&(De.data=se.data),T[Z]=De,V++}r.attributes=T,r.attributesNum=V,r.index=b}function y(){let O=r.newAttributes;for(let P=0,X=O.length;P<X;P++)O[P]=0}function g(O){f(O,0)}function f(O,P){let X=r.newAttributes,b=r.enabledAttributes,T=r.attributeDivisors;X[O]=1,b[O]===0&&(n.enableVertexAttribArray(O),b[O]=1),T[O]!==P&&(n.vertexAttribDivisor(O,P),T[O]=P)}function M(){let O=r.newAttributes,P=r.enabledAttributes;for(let X=0,b=P.length;X<b;X++)P[X]!==O[X]&&(n.disableVertexAttribArray(X),P[X]=0)}function C(O,P,X,b,T,k,V){V===!0?n.vertexAttribIPointer(O,P,X,T,k):n.vertexAttribPointer(O,P,X,b,T,k)}function S(O,P,X,b){y();let T=b.attributes,k=X.getAttributes(),V=P.defaultAttributeValues;for(let re in k){let Z=k[re];if(Z.location>=0){let ne=T[re];if(ne===void 0&&(re==="instanceMatrix"&&O.instanceMatrix&&(ne=O.instanceMatrix),re==="instanceColor"&&O.instanceColor&&(ne=O.instanceColor)),ne!==void 0){let se=ne.normalized,De=ne.itemSize,Re=e.get(ne);if(Re===void 0)continue;let mt=Re.buffer,nt=Re.type,lt=Re.bytesPerElement,K=nt===n.INT||nt===n.UNSIGNED_INT||ne.gpuType===io;if(ne.isInterleavedBufferAttribute){let te=ne.data,be=te.stride,ze=ne.offset;if(te.isInstancedInterleavedBuffer){for(let ce=0;ce<Z.locationSize;ce++)f(Z.location+ce,te.meshPerAttribute);O.isInstancedMesh!==!0&&b._maxInstanceCount===void 0&&(b._maxInstanceCount=te.meshPerAttribute*te.count)}else for(let ce=0;ce<Z.locationSize;ce++)g(Z.location+ce);n.bindBuffer(n.ARRAY_BUFFER,mt);for(let ce=0;ce<Z.locationSize;ce++)C(Z.location+ce,De/Z.locationSize,nt,se,be*lt,(ze+De/Z.locationSize*ce)*lt,K)}else{if(ne.isInstancedBufferAttribute){for(let te=0;te<Z.locationSize;te++)f(Z.location+te,ne.meshPerAttribute);O.isInstancedMesh!==!0&&b._maxInstanceCount===void 0&&(b._maxInstanceCount=ne.meshPerAttribute*ne.count)}else for(let te=0;te<Z.locationSize;te++)g(Z.location+te);n.bindBuffer(n.ARRAY_BUFFER,mt);for(let te=0;te<Z.locationSize;te++)C(Z.location+te,De/Z.locationSize,nt,se,De*lt,De/Z.locationSize*te*lt,K)}}else if(V!==void 0){let se=V[re];if(se!==void 0)switch(se.length){case 2:n.vertexAttrib2fv(Z.location,se);break;case 3:n.vertexAttrib3fv(Z.location,se);break;case 4:n.vertexAttrib4fv(Z.location,se);break;default:n.vertexAttrib1fv(Z.location,se)}}}}M()}function E(){R();for(let O in i){let P=i[O];for(let X in P){let b=P[X];for(let T in b){let k=b[T];for(let V in k)u(k[V].object),delete k[V];delete b[T]}}delete i[O]}}function w(O){if(i[O.id]===void 0)return;let P=i[O.id];for(let X in P){let b=P[X];for(let T in b){let k=b[T];for(let V in k)u(k[V].object),delete k[V];delete b[T]}}delete i[O.id]}function I(O){for(let P in i){let X=i[P];for(let b in X){let T=X[b];if(T[O.id]===void 0)continue;let k=T[O.id];for(let V in k)u(k[V].object),delete k[V];delete T[O.id]}}}function v(O){for(let P in i){let X=i[P],b=O.isInstancedMesh===!0?O.id:0,T=X[b];if(T!==void 0){for(let k in T){let V=T[k];for(let re in V)u(V[re].object),delete V[re];delete T[k]}delete X[b],Object.keys(X).length===0&&delete i[P]}}}function R(){D(),a=!0,r!==s&&(r=s,c(r.object))}function D(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:R,resetDefaultState:D,dispose:E,releaseStatesOfGeometry:w,releaseStatesOfObject:v,releaseStatesOfProgram:I,initAttributes:y,enableAttribute:g,disableUnusedAttributes:M}}function D_(n,e,t){let i;function s(l){i=l}function r(l,c){n.drawArrays(i,l,c),t.update(c,i,1)}function a(l,c,u){u!==0&&(n.drawArraysInstanced(i,l,c,u),t.update(c,i,u))}function o(l,c,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,c,0,u);let h=0;for(let p=0;p<u;p++)h+=c[p];t.update(h,i,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function L_(n,e,t,i){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let I=e.get("EXT_texture_filter_anisotropic");s=n.getParameter(I.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(I){return!(I!==yn&&i.convert(I)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(I){let v=I===In&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(I!==sn&&I!==Cn&&!v&&i.convert(I)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE))}function l(I){if(I==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";I="mediump"}return I==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",u=l(c);u!==c&&(Ue("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);let d=t.logarithmicDepthBuffer===!0,h=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&h===!1&&Ue("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let p=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),m=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),y=n.getParameter(n.MAX_TEXTURE_SIZE),g=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),f=n.getParameter(n.MAX_VERTEX_ATTRIBS),M=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),C=n.getParameter(n.MAX_VARYING_VECTORS),S=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),E=n.getParameter(n.MAX_SAMPLES),w=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:h,maxTextures:p,maxVertexTextures:m,maxTextureSize:y,maxCubemapSize:g,maxAttributes:f,maxVertexUniforms:M,maxVaryings:C,maxFragmentUniforms:S,maxSamples:E,samples:w}}function U_(n){let e=this,t=null,i=0,s=!1,r=!1,a=new dn,o=new Ve,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,h){let p=d.length!==0||h||i!==0||s;return s=h,i=d.length,p},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,h){t=u(d,h,0)},this.setState=function(d,h,p){let m=d.clippingPlanes,y=d.clipIntersection,g=d.clipShadows,f=n.get(d);if(!s||m===null||m.length===0||r&&!g)r?u(null):c();else{let M=r?0:i,C=M*4,S=f.clippingState||null;l.value=S,S=u(m,h,C,p);for(let E=0;E!==C;++E)S[E]=t[E];f.clippingState=S,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(d,h,p,m){let y=d!==null?d.length:0,g=null;if(y!==0){if(g=l.value,m!==!0||g===null){let f=p+y*4,M=h.matrixWorldInverse;o.getNormalMatrix(M),(g===null||g.length<f)&&(g=new Float32Array(f));for(let C=0,S=p;C!==y;++C,S+=4)a.copy(d[C]).applyMatrix4(M,o),a.normal.toArray(g,S),g[S+3]=a.constant}l.value=g,l.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,g}}var Ls=4,F_=6,O_=20,k_=256,Rr=new Ts,xd=new tt,Vc=null,Hc=0,Gc=0,Wc=!1,B_=new U,Gi=new U,Xo=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,s=100,r={}){let{size:a=256,position:o=B_}=r;Vc=this._renderer.getRenderTarget(),Hc=this._renderer.getActiveCubeFace(),Gc=this._renderer.getActiveMipmapLevel(),Wc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,s,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Sd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=bd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Vc,Hc,Gc),this._renderer.xr.enabled=Wc,e.scissorTest=!1,Ds(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ei||e.mapping===Vi?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Vc=this._renderer.getRenderTarget(),Hc=this._renderer.getActiveCubeFace(),Gc=this._renderer.getActiveMipmapLevel(),Wc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Bt,minFilter:Bt,generateMipmaps:!1,type:In,format:yn,colorSpace:js,depthBuffer:!1},s=yd(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=yd(e,t,i);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=z_(r)),this._blurMaterial=H_(r,e,t),this._ggxMaterial=V_(r,e,t)}return s}_compileMaterial(e){let t=new Vt(new $t,e);this._renderer.compile(t,Rr)}_sceneToCubeUV(e,t,i,s,r){let l=new qt(90,1,t,i),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],d=this._renderer,h=d.autoClear,p=d.toneMapping;d.getClearColor(xd),d.toneMapping=An,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Vt(new gi,new ar({name:"PMREM.Background",side:Jt,depthWrite:!1,depthTest:!1})));let y=this._backgroundBox,g=y.material,f=!1,M=e.background;M?M.isColor&&(g.color.copy(M),e.background=null,f=!0):(g.color.copy(xd),f=!0);for(let C=0;C<6;C++){let S=C%3;S===0?(l.up.set(0,c[C],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+u[C],r.y,r.z)):S===1?(l.up.set(0,0,c[C]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+u[C],r.z)):(l.up.set(0,c[C],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+u[C]));let E=this._cubeSize;Ds(s,S*E,C>2?E:0,E,E),d.setRenderTarget(s),f&&d.render(y,l),d.render(e,l)}d.toneMapping=p,d.autoClear=h,e.background=M}_textureToCubeUV(e,t){let i=this._renderer,s=e.mapping===Ei||e.mapping===Vi;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Sd()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=bd());let r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=e;let l=this._cubeSize;Ds(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(a,Rr)}_applyPMREM(e){let t=this._renderer,i=t.autoClear;t.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=i}_applyGGXFilter(e,t,i){let s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[i];o.material=a;let l=a.uniforms,c=i/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),d=Math.sqrt(c*c-u*u),h=c*1.25,p=d*h,{_lodMax:m}=this,y=this._sizeLods[i],g=3*y*(i>m-Ls?i-m+Ls:0),f=4*(this._cubeSize-y);l.envMap.value=e.texture,l.roughness.value=p,l.mipInt.value=m-t,Ds(r,g,f,3*y,2*y),s.setRenderTarget(r),s.render(o,Rr),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=m-i,Ds(e,g,f,3*y,2*y),s.setRenderTarget(e),s.render(o,Rr)}_blur(e,t,i,s){let r=this._pingPongRenderTarget,a=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(e,r,t,i,a),this._blurPass(r,e,i,i,a)}_blurPass(e,t,i,s,r){let a=this._renderer,o=this._blurMaterial,l=this._lodMeshes[s];l.material=o;let c=o.uniforms;c.envMap.value=e.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-i;let u=this._sizeLods[s],d=3*u*(s>this._lodMax-Ls?s-this._lodMax+Ls:0),h=4*(this._cubeSize-u);Ds(t,d,h,3*u,2*u),a.setRenderTarget(t),a.render(l,Rr)}};function z_(n){let e=[],t=[],i=n,s=n-Ls+1+F_;for(let r=0;r<s;r++){let a=Math.pow(2,i);e.push(a);let o=1/(a-2),l=-o,c=1+o,u=[l,l,c,l,c,c,l,l,c,c,l,c],d=6,h=6,p=3,m=new Float32Array(p*h*d),y=new Float32Array(p*h*d);for(let f=0;f<d;f++){let M=f%3*2/3-1,C=f>2?0:-1,S=[M,C,0,M+2/3,C,0,M+2/3,C+1,0,M,C,0,M+2/3,C+1,0,M,C+1,0];m.set(S,p*h*f);for(let E=0;E<h;E++){let w=u[E*2]*2-1,I=u[E*2+1]*2-1;f===0?Gi.set(1,I,w):f===1?Gi.set(-w,1,-I):f===2?Gi.set(-w,I,1):f===3?Gi.set(-1,I,-w):f===4?Gi.set(-w,-1,I):Gi.set(w,I,-1),Gi.toArray(y,(f*h+E)*p)}}let g=new $t;g.setAttribute("position",new kt(m,p)),g.setAttribute("outputDirection",new kt(y,p)),t.push(new Vt(g,null)),i>Ls&&i--}return{lodMeshes:t,sizeLods:e}}function yd(n,e,t){let i=new nn(n,e,t);return i.texture.mapping=xr,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Ds(n,e,t,i,s){n.viewport.set(e,t,i,s),n.scissor.set(e,t,i,s)}function V_(n,e,t){return new pn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:k_,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Yo(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:zn,depthTest:!1,depthWrite:!1})}function H_(n,e,t){return new pn({name:"SphericalGaussianBlur",defines:{SAMPLES:O_,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Yo(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:zn,depthTest:!1,depthWrite:!1})}function bd(){return new pn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Yo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:zn,depthTest:!1,depthWrite:!1})}function Sd(){return new pn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Yo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:zn,depthTest:!1,depthWrite:!1})}function Yo(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var qo=class extends nn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let i={width:e,height:e,depth:1},s=[i,i,i,i,i,i];this.texture=new lr(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new gi(5,5,5),r=new pn({name:"CubemapFromEquirect",uniforms:Hi(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Jt,blending:zn});r.uniforms.tEquirect.value=t;let a=new Vt(s,r),o=t.minFilter;return t.minFilter===Ti&&(t.minFilter=Bt),new ja(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,i=!0,s=!0){let r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,i,s);e.setRenderTarget(r)}};function G_(n){let e=new WeakMap,t=new WeakMap,i=null;function s(h,p=!1){return h==null?null:p?a(h):r(h)}function r(h){if(h&&h.isTexture){let p=h.mapping;if(p===eo||p===to)if(e.has(h)){let m=e.get(h).texture;return o(m,h.mapping)}else{let m=h.image;if(m&&m.height>0){let y=new qo(m.height);return y.fromEquirectangularTexture(n,h),e.set(h,y),h.addEventListener("dispose",c),o(y.texture,h.mapping)}else return null}}return h}function a(h){if(h&&h.isTexture){let p=h.mapping,m=p===eo||p===to,y=p===Ei||p===Vi;if(m||y){let g=t.get(h),f=g!==void 0?g.texture.pmremVersion:0;if(h.isRenderTargetTexture&&h.pmremVersion!==f)return i===null&&(i=new Xo(n)),g=m?i.fromEquirectangular(h,g):i.fromCubemap(h,g),g.texture.pmremVersion=h.pmremVersion,t.set(h,g),g.texture;if(g!==void 0)return g.texture;{let M=h.image;return m&&M&&M.height>0||y&&M&&l(M)?(i===null&&(i=new Xo(n)),g=m?i.fromEquirectangular(h):i.fromCubemap(h),g.texture.pmremVersion=h.pmremVersion,t.set(h,g),h.addEventListener("dispose",u),g.texture):null}}}return h}function o(h,p){return p===eo?h.mapping=Ei:p===to&&(h.mapping=Vi),h}function l(h){let p=0,m=6;for(let y=0;y<m;y++)h[y]!==void 0&&p++;return p===m}function c(h){let p=h.target;p.removeEventListener("dispose",c);let m=e.get(p);m!==void 0&&(e.delete(p),m.dispose())}function u(h){let p=h.target;p.removeEventListener("dispose",u);let m=t.get(p);m!==void 0&&(t.delete(p),m.dispose())}function d(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:s,dispose:d}}function W_(n){let e={};function t(i){if(e[i]!==void 0)return e[i];let s=n.getExtension(i);return e[i]=s,s}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){let s=t(i);return s===null&&Oi("WebGLRenderer: "+i+" extension not supported."),s}}}function X_(n,e,t,i){let s={},r=new WeakMap;function a(d){let h=d.target;h.index!==null&&e.remove(h.index);for(let m in h.attributes)e.remove(h.attributes[m]);h.removeEventListener("dispose",a),delete s[h.id];let p=r.get(h);p&&(e.remove(p),r.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function o(d,h){return s[h.id]===!0||(h.addEventListener("dispose",a),s[h.id]=!0,t.memory.geometries++),h}function l(d){let h=d.attributes;for(let p in h)e.update(h[p],n.ARRAY_BUFFER)}function c(d){let h=[],p=d.index,m=d.attributes.position,y=0;if(m===void 0)return;if(p!==null){let M=p.array;y=p.version;for(let C=0,S=M.length;C<S;C+=3){let E=M[C+0],w=M[C+1],I=M[C+2];h.push(E,w,w,I,I,E)}}else{let M=m.array;y=m.version;for(let C=0,S=M.length/3-1;C<S;C+=3){let E=C+0,w=C+1,I=C+2;h.push(E,w,w,I,I,E)}}let g=new(m.count>=65535?rr:sr)(h,1);g.version=y;let f=r.get(d);f&&e.remove(f),r.set(d,g)}function u(d){let h=r.get(d);if(h){let p=d.index;p!==null&&h.version<p.version&&c(d)}else c(d);return r.get(d)}return{get:o,update:l,getWireframeAttribute:u}}function q_(n,e,t){let i;function s(d){i=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function l(d,h){n.drawElements(i,h,r,d*a),t.update(h,i,1)}function c(d,h,p){p!==0&&(n.drawElementsInstanced(i,h,r,d*a,p),t.update(h,i,p))}function u(d,h,p){if(p===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,h,0,r,d,0,p);let y=0;for(let g=0;g<p;g++)y+=h[g];t.update(y,i,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=u}function $_(n){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,a,o){switch(t.calls++,a){case n.TRIANGLES:t.triangles+=o*(r/3);break;case n.LINES:t.lines+=o*(r/2);break;case n.LINE_STRIP:t.lines+=o*(r-1);break;case n.LINE_LOOP:t.lines+=o*r;break;case n.POINTS:t.points+=o*r;break;default:ke("WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:i}}function Y_(n,e,t){let i=new WeakMap,s=new Tt;function r(a,o,l){let c=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=u!==void 0?u.length:0,h=i.get(o);if(h===void 0||h.count!==d){let R=function(){I.dispose(),i.delete(o),o.removeEventListener("dispose",R)};h!==void 0&&h.texture.dispose();let p=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,y=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],f=o.morphAttributes.normal||[],M=o.morphAttributes.color||[],C=0;p===!0&&(C=1),m===!0&&(C=2),y===!0&&(C=3);let S=o.attributes.position.count*C,E=1;S>e.maxTextureSize&&(E=Math.ceil(S/e.maxTextureSize),S=e.maxTextureSize);let w=new Float32Array(S*E*4*d),I=new tr(w,S,E,d);I.type=Cn,I.needsUpdate=!0;let v=C*4;for(let D=0;D<d;D++){let O=g[D],P=f[D],X=M[D],b=S*E*4*D;for(let T=0;T<O.count;T++){let k=T*v;p===!0&&(s.fromBufferAttribute(O,T),w[b+k+0]=s.x,w[b+k+1]=s.y,w[b+k+2]=s.z,w[b+k+3]=0),m===!0&&(s.fromBufferAttribute(P,T),w[b+k+4]=s.x,w[b+k+5]=s.y,w[b+k+6]=s.z,w[b+k+7]=0),y===!0&&(s.fromBufferAttribute(X,T),w[b+k+8]=s.x,w[b+k+9]=s.y,w[b+k+10]=s.z,w[b+k+11]=X.itemSize===4?s.w:1)}}h={count:d,texture:I,size:new Be(S,E)},i.set(o,h),o.addEventListener("dispose",R)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",a.morphTexture,t);else{let p=0;for(let y=0;y<c.length;y++)p+=c[y];let m=o.morphTargetsRelative?1:1-p;l.getUniforms().setValue(n,"morphTargetBaseInfluence",m),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",h.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",h.size)}return{update:r}}function Z_(n,e,t,i,s){let r=new WeakMap;function a(c){let u=s.render.frame,d=c.geometry,h=e.get(c,d);if(r.get(h)!==u&&(e.update(h),r.set(h,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==u&&(t.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,n.ARRAY_BUFFER),r.set(c,u))),c.isSkinnedMesh){let p=c.skeleton;r.get(p)!==u&&(p.update(),r.set(p,u))}return h}function o(){r=new WeakMap}function l(c){let u=c.target;u.removeEventListener("dispose",l),i.releaseStatesOfObject(u),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return{update:a,dispose:o}}var K_={[xc]:"LINEAR_TONE_MAPPING",[yc]:"REINHARD_TONE_MAPPING",[bc]:"CINEON_TONE_MAPPING",[Sc]:"ACES_FILMIC_TONE_MAPPING",[Ec]:"AGX_TONE_MAPPING",[Tc]:"NEUTRAL_TONE_MAPPING",[Mc]:"CUSTOM_TONE_MAPPING"};function J_(n,e,t,i,s,r){let a=new nn(e,t,{type:n,depthBuffer:s,stencilBuffer:r,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,l=null,c=new $t;c.setAttribute("position",new Ft([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Ft([0,2,0,0,2,0],2));let u=new ka({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new Vt(c,u),h=new Ts(-1,1,1,-1,0,1),p=null,m=null,y=!1,g,f=null,M=[],C=!1;this.setSize=function(S,E){a.setSize(S,E),o!==null&&o.setSize(S,E),l!==null&&l.setSize(S,E);for(let w=0;w<M.length;w++){let I=M[w];I.setSize&&I.setSize(S,E)}},this.setEffects=function(S){M=S,C=M.length>0&&M[0].isRenderPass===!0;let E=a.width,w=a.height;M.length>0&&o===null&&(o=new nn(E,w,{type:In,depthBuffer:!1,stencilBuffer:!1}),l=new nn(E,w,{type:In,depthBuffer:!1,stencilBuffer:!1}));for(let I=0;I<M.length;I++){let v=M[I];v.setSize&&v.setSize(E,w)}},this.begin=function(S,E){if(y||S.toneMapping===An&&M.length===0)return!1;if(f=E,E!==null){let w=E.width,I=E.height;(a.width!==w||a.height!==I)&&this.setSize(w,I)}return C===!1&&S.setRenderTarget(a),g=S.toneMapping,S.toneMapping=An,!0},this.hasRenderPass=function(){return C},this.end=function(S,E){S.toneMapping=g,y=!0;let w=a,I=o;for(let v=0;v<M.length;v++){let R=M[v];R.enabled!==!1&&(R.render(S,I,w,E),R.needsSwap!==!1&&(w=I,I=I===o?l:o))}if(p!==S.outputColorSpace||m!==S.toneMapping){p=S.outputColorSpace,m=S.toneMapping,u.defines={},ot.getTransfer(p)===dt&&(u.defines.SRGB_TRANSFER="");let v=K_[m];v&&(u.defines[v]=""),u.needsUpdate=!0}u.uniforms.tDiffuse.value=w.texture,S.setRenderTarget(f),S.render(d,h),f=null,y=!1},this.isCompositing=function(){return y},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),c.dispose(),u.dispose()}}var Hd=new tn,$c=new mi(1,1),Gd=new tr,Wd=new Na,Xd=new lr,Md=[],Ed=[],Td=new Float32Array(16),wd=new Float32Array(9),Ad=new Float32Array(4);function Fs(n,e,t){let i=n[0];if(i<=0||i>0)return n;let s=e*t,r=Md[s];if(r===void 0&&(r=new Float32Array(s),Md[s]=r),e!==0){i.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,n[a].toArray(r,o)}return r}function Pt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Nt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function Zo(n,e){let t=Ed[e];t===void 0&&(t=new Int32Array(e),Ed[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function j_(n,e){let t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Q_(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2fv(this.addr,e),Nt(t,e)}}function e0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;n.uniform3fv(this.addr,e),Nt(t,e)}}function t0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4fv(this.addr,e),Nt(t,e)}}function n0(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Nt(t,e)}else{if(Pt(t,i))return;Ad.set(i),n.uniformMatrix2fv(this.addr,!1,Ad),Nt(t,i)}}function i0(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Nt(t,e)}else{if(Pt(t,i))return;wd.set(i),n.uniformMatrix3fv(this.addr,!1,wd),Nt(t,i)}}function s0(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Nt(t,e)}else{if(Pt(t,i))return;Td.set(i),n.uniformMatrix4fv(this.addr,!1,Td),Nt(t,i)}}function r0(n,e){let t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function a0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2iv(this.addr,e),Nt(t,e)}}function o0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;n.uniform3iv(this.addr,e),Nt(t,e)}}function l0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4iv(this.addr,e),Nt(t,e)}}function c0(n,e){let t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function u0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2uiv(this.addr,e),Nt(t,e)}}function h0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;n.uniform3uiv(this.addr,e),Nt(t,e)}}function d0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4uiv(this.addr,e),Nt(t,e)}}function f0(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?($c.compareFunction=t.isReversedDepthBuffer()?Ho:Vo,r=$c):r=Hd,t.setTexture2D(e||r,s)}function p0(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture3D(e||Wd,s)}function m0(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTextureCube(e||Xd,s)}function g0(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture2DArray(e||Gd,s)}function _0(n){switch(n){case 5126:return j_;case 35664:return Q_;case 35665:return e0;case 35666:return t0;case 35674:return n0;case 35675:return i0;case 35676:return s0;case 5124:case 35670:return r0;case 35667:case 35671:return a0;case 35668:case 35672:return o0;case 35669:case 35673:return l0;case 5125:return c0;case 36294:return u0;case 36295:return h0;case 36296:return d0;case 35678:case 36198:case 36298:case 36306:case 35682:return f0;case 35679:case 36299:case 36307:return p0;case 35680:case 36300:case 36308:case 36293:return m0;case 36289:case 36303:case 36311:case 36292:return g0}}function v0(n,e){n.uniform1fv(this.addr,e)}function x0(n,e){let t=Fs(e,this.size,2);n.uniform2fv(this.addr,t)}function y0(n,e){let t=Fs(e,this.size,3);n.uniform3fv(this.addr,t)}function b0(n,e){let t=Fs(e,this.size,4);n.uniform4fv(this.addr,t)}function S0(n,e){let t=Fs(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function M0(n,e){let t=Fs(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function E0(n,e){let t=Fs(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function T0(n,e){n.uniform1iv(this.addr,e)}function w0(n,e){n.uniform2iv(this.addr,e)}function A0(n,e){n.uniform3iv(this.addr,e)}function R0(n,e){n.uniform4iv(this.addr,e)}function C0(n,e){n.uniform1uiv(this.addr,e)}function I0(n,e){n.uniform2uiv(this.addr,e)}function P0(n,e){n.uniform3uiv(this.addr,e)}function N0(n,e){n.uniform4uiv(this.addr,e)}function D0(n,e,t){let i=this.cache,s=e.length,r=Zo(t,s);Pt(i,r)||(n.uniform1iv(this.addr,r),Nt(i,r));let a;this.type===n.SAMPLER_2D_SHADOW?a=$c:a=Hd;for(let o=0;o!==s;++o)t.setTexture2D(e[o]||a,r[o])}function L0(n,e,t){let i=this.cache,s=e.length,r=Zo(t,s);Pt(i,r)||(n.uniform1iv(this.addr,r),Nt(i,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||Wd,r[a])}function U0(n,e,t){let i=this.cache,s=e.length,r=Zo(t,s);Pt(i,r)||(n.uniform1iv(this.addr,r),Nt(i,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||Xd,r[a])}function F0(n,e,t){let i=this.cache,s=e.length,r=Zo(t,s);Pt(i,r)||(n.uniform1iv(this.addr,r),Nt(i,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||Gd,r[a])}function O0(n){switch(n){case 5126:return v0;case 35664:return x0;case 35665:return y0;case 35666:return b0;case 35674:return S0;case 35675:return M0;case 35676:return E0;case 5124:case 35670:return T0;case 35667:case 35671:return w0;case 35668:case 35672:return A0;case 35669:case 35673:return R0;case 5125:return C0;case 36294:return I0;case 36295:return P0;case 36296:return N0;case 35678:case 36198:case 36298:case 36306:case 35682:return D0;case 35679:case 36299:case 36307:return L0;case 35680:case 36300:case 36308:case 36293:return U0;case 36289:case 36303:case 36311:case 36292:return F0}}var Yc=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=_0(t.type)}},Zc=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=O0(t.type)}},Kc=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(e,t[o.id],i)}}},Xc=/(\w+)(\])?(\[|\.)?/g;function Rd(n,e){n.seq.push(e),n.map[e.id]=e}function k0(n,e,t){let i=n.name,s=i.length;for(Xc.lastIndex=0;;){let r=Xc.exec(i),a=Xc.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){Rd(t,c===void 0?new Yc(o,n,e):new Zc(o,n,e));break}else{let d=t.map[o];d===void 0&&(d=new Kc(o),Rd(t,d)),t=d}}}var Us=class{constructor(e,t){this.seq=[],this.map={};let i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let a=0;a<i;++a){let o=e.getActiveUniform(t,a),l=e.getUniformLocation(t,o.name);k0(o,l,this)}let s=[],r=[];for(let a of this.seq)a.type===e.SAMPLER_2D_SHADOW||a.type===e.SAMPLER_CUBE_SHADOW||a.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,i,s){let r=this.map[t];r!==void 0&&r.setValue(e,i,s)}setOptional(e,t,i){let s=t[i];s!==void 0&&this.setValue(e,i,s)}static upload(e,t,i,s){for(let r=0,a=t.length;r!==a;++r){let o=t[r],l=i[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,s)}}static seqWithValue(e,t){let i=[];for(let s=0,r=e.length;s!==r;++s){let a=e[s];a.id in t&&i.push(a)}return i}};function Cd(n,e,t){let i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}var B0=37297,z0=0;function V0(n,e){let t=n.split(`
`),i=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){let o=a+1;i.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return i.join(`
`)}var Id=new Ve;function H0(n){ot._getMatrix(Id,ot.workingColorSpace,n);let e=`mat3( ${Id.elements.map(t=>t.toFixed(4))} )`;switch(ot.getTransfer(n)){case Qs:return[e,"LinearTransferOETF"];case dt:return[e,"sRGBTransferOETF"];default:return Ue("WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function Pd(n,e,t){let i=n.getShaderParameter(e,n.COMPILE_STATUS),r=(n.getShaderInfoLog(e)||"").trim();if(i&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+V0(n.getShaderSource(e),o)}else return r}function G0(n,e){let t=H0(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var W0={[xc]:"Linear",[yc]:"Reinhard",[bc]:"Cineon",[Sc]:"ACESFilmic",[Ec]:"AgX",[Tc]:"Neutral",[Mc]:"Custom"};function X0(n,e){let t=W0[e];return t===void 0?(Ue("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var Wo=new U;function q0(){ot.getLuminanceCoefficients(Wo);let n=Wo.x.toFixed(4),e=Wo.y.toFixed(4),t=Wo.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function $0(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ir).join(`
`)}function Y0(n){let e=[];for(let t in n){let i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function Z0(n,e){let t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){let r=n.getActiveAttrib(e,s),a=r.name,o=1;r.type===n.FLOAT_MAT2&&(o=2),r.type===n.FLOAT_MAT3&&(o=3),r.type===n.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:n.getAttribLocation(e,a),locationSize:o}}return t}function Ir(n){return n!==""}function Nd(n,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Dd(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var K0=/^[ \t]*#include +<([\w\d./]+)>/gm;function Jc(n){return n.replace(K0,j0)}var J0=new Map;function j0(n,e){let t=je[e];if(t===void 0){let i=J0.get(e);if(i!==void 0)t=je[i],Ue('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return Jc(t)}var Q0=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ld(n){return n.replace(Q0,ev)}function ev(n,e,t,i){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Ud(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var tv={[vr]:"SHADOWMAP_TYPE_PCF",[Rs]:"SHADOWMAP_TYPE_VSM"};function nv(n){return tv[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var iv={[Ei]:"ENVMAP_TYPE_CUBE",[Vi]:"ENVMAP_TYPE_CUBE",[xr]:"ENVMAP_TYPE_CUBE_UV"};function sv(n){return n.envMap===!1?"ENVMAP_TYPE_CUBE":iv[n.envMapMode]||"ENVMAP_TYPE_CUBE"}var rv={[Vi]:"ENVMAP_MODE_REFRACTION"};function av(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":rv[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}var ov={[vc]:"ENVMAP_BLENDING_MULTIPLY",[jh]:"ENVMAP_BLENDING_MIX",[Qh]:"ENVMAP_BLENDING_ADD"};function lv(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":ov[n.combine]||"ENVMAP_BLENDING_NONE"}function cv(n){let e=n.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function uv(n,e,t,i){let s=n.getContext(),r=t.defines,a=t.vertexShader,o=t.fragmentShader,l=nv(t),c=sv(t),u=av(t),d=lv(t),h=cv(t),p=$0(t),m=Y0(r),y=s.createProgram(),g,f,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Ir).join(`
`),g.length>0&&(g+=`
`),f=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Ir).join(`
`),f.length>0&&(f+=`
`)):(g=[Ud(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ir).join(`
`),f=[Ud(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+d:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.retroreflection?"#define USE_RETROREFLECTION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==An?"#define TONE_MAPPING":"",t.toneMapping!==An?je.tonemapping_pars_fragment:"",t.toneMapping!==An?X0("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",je.colorspace_pars_fragment,G0("linearToOutputTexel",t.outputColorSpace),q0(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ir).join(`
`)),a=Jc(a),a=Nd(a,t),a=Dd(a,t),o=Jc(o),o=Nd(o,t),o=Dd(o,t),a=Ld(a),o=Ld(o),t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,g=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,f=["#define varying in",t.glslVersion===Lc?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Lc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);let C=M+g+a,S=M+f+o,E=Cd(s,s.VERTEX_SHADER,C),w=Cd(s,s.FRAGMENT_SHADER,S);s.attachShader(y,E),s.attachShader(y,w),t.index0AttributeName!==void 0?s.bindAttribLocation(y,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(y,0,"position"),s.linkProgram(y);function I(O){if(n.debug.checkShaderErrors){let P=s.getProgramInfoLog(y)||"",X=s.getShaderInfoLog(E)||"",b=s.getShaderInfoLog(w)||"",T=P.trim(),k=X.trim(),V=b.trim(),re=!0,Z=!0;if(s.getProgramParameter(y,s.LINK_STATUS)===!1)if(re=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,y,E,w);else{let ne=Pd(s,E,"vertex"),se=Pd(s,w,"fragment");ke("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(y,s.VALIDATE_STATUS)+`

Material Name: `+O.name+`
Material Type: `+O.type+`

Program Info Log: `+T+`
`+ne+`
`+se)}else T!==""?Ue("WebGLProgram: Program Info Log:",T):(k===""||V==="")&&(Z=!1);Z&&(O.diagnostics={runnable:re,programLog:T,vertexShader:{log:k,prefix:g},fragmentShader:{log:V,prefix:f}})}s.deleteShader(E),s.deleteShader(w),v=new Us(s,y),R=Z0(s,y)}let v;this.getUniforms=function(){return v===void 0&&I(this),v};let R;this.getAttributes=function(){return R===void 0&&I(this),R};let D=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return D===!1&&(D=s.getProgramParameter(y,B0)),D},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(y),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=z0++,this.cacheKey=e,this.usedTimes=1,this.program=y,this.vertexShader=E,this.fragmentShader=w,this}var hv=0,jc=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,i){let s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(i)===!1&&(s.add(i),i.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){let t=this.shaderCache,i=t.get(e);return i===void 0&&(i=new Qc(e),t.set(e,i)),i}},Qc=class{constructor(e){this.id=hv++,this.code=e,this.usedTimes=0}};function dv(n){return n===Ai||n===Tr||n===wr}function fv(n,e,t,i,s,r){let a=new nr,o=new jc,l=new Set,c=[],u=new Map,d=i.logarithmicDepthBuffer,h=i.precision,p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(v){return l.add(v),v===0?"uv":`uv${v}`}function y(v,R,D,O,P,X){let b=O.fog,T=P.geometry,k=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?O.environment:null,V=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,re=e.get(v.envMap||k,V),Z=re&&re.mapping===xr?re.image.height:null,ne=p[v.type];v.precision!==null&&(h=i.getMaxPrecision(v.precision),h!==v.precision&&Ue("WebGLProgram.getParameters:",v.precision,"not supported, using",h,"instead."));let se=T.morphAttributes.position||T.morphAttributes.normal||T.morphAttributes.color,De=se!==void 0?se.length:0,Re=0;T.morphAttributes.position!==void 0&&(Re=1),T.morphAttributes.normal!==void 0&&(Re=2),T.morphAttributes.color!==void 0&&(Re=3);let mt,nt,lt,K;if(ne){let xt=Hn[ne];mt=xt.vertexShader,nt=xt.fragmentShader}else{mt=v.vertexShader,nt=v.fragmentShader;let xt=o.getVertexShaderStage(v),ut=o.getFragmentShaderStage(v);o.update(v,xt,ut),lt=xt.id,K=ut.id}let te=n.getRenderTarget(),be=n.state.buffers.depth.getReversed(),ze=P.isInstancedMesh===!0,ce=P.isBatchedMesh===!0,Ye=!!v.map,Mt=!!v.matcap,Ze=!!re,it=!!v.aoMap,gt=!!v.lightMap,Qe=!!v.bumpMap&&v.wireframe===!1,oe=!!v.normalMap,Ce=!!v.displacementMap,Le=!!v.emissiveMap,Ge=!!v.metalnessMap,at=!!v.roughnessMap,N=v.anisotropy>0,ft=v.clearcoat>0,qe=v.dispersion>0,A=v.retroreflectivity>0,_=v.iridescence>0,B=v.sheen>0,W=v.transmission>0,J=N&&!!v.anisotropyMap,le=ft&&!!v.clearcoatMap,ue=ft&&!!v.clearcoatNormalMap,j=ft&&!!v.clearcoatRoughnessMap,ee=_&&!!v.iridescenceMap,he=_&&!!v.iridescenceThicknessMap,Ie=B&&!!v.sheenColorMap,me=B&&!!v.sheenRoughnessMap,de=!!v.specularMap,Pe=!!v.specularColorMap,Fe=!!v.specularIntensityMap,We=W&&!!v.transmissionMap,F=W&&!!v.thicknessMap,fe=!!v.gradientMap,Q=!!v.alphaMap,pe=v.alphaTest>0,xe=!!v.alphaHash,ae=!!v.extensions,Ne=An;v.toneMapped&&(te===null||te.isXRRenderTarget===!0)&&(Ne=n.toneMapping);let Te={shaderID:ne,shaderType:v.type,shaderName:v.name,vertexShader:mt,fragmentShader:nt,defines:v.defines,customVertexShaderID:lt,customFragmentShaderID:K,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:h,batching:ce,batchingColor:ce&&P._colorsTexture!==null,instancing:ze,instancingColor:ze&&P.instanceColor!==null,instancingMorph:ze&&P.morphTexture!==null,outputColorSpace:te===null?n.outputColorSpace:te.isXRRenderTarget===!0?te.texture.colorSpace:ot.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:Ye,matcap:Mt,envMap:Ze,envMapMode:Ze&&re.mapping,envMapCubeUVHeight:Z,aoMap:it,lightMap:gt,bumpMap:Qe,normalMap:oe,displacementMap:Ce,emissiveMap:Le,normalMapObjectSpace:oe&&v.normalMapType===nd,normalMapTangentSpace:oe&&v.normalMapType===zo,packedNormalMap:oe&&v.normalMapType===zo&&dv(v.normalMap.format),metalnessMap:Ge,roughnessMap:at,anisotropy:N,anisotropyMap:J,clearcoat:ft,clearcoatMap:le,clearcoatNormalMap:ue,clearcoatRoughnessMap:j,dispersion:qe,retroreflection:A,iridescence:_,iridescenceMap:ee,iridescenceThicknessMap:he,sheen:B,sheenColorMap:Ie,sheenRoughnessMap:me,specularMap:de,specularColorMap:Pe,specularIntensityMap:Fe,transmission:W,transmissionMap:We,thicknessMap:F,gradientMap:fe,opaque:v.transparent===!1&&v.blending===Cs&&v.alphaToCoverage===!1,alphaMap:Q,alphaTest:pe,alphaHash:xe,combine:v.combine,mapUv:Ye&&m(v.map.channel),aoMapUv:it&&m(v.aoMap.channel),lightMapUv:gt&&m(v.lightMap.channel),bumpMapUv:Qe&&m(v.bumpMap.channel),normalMapUv:oe&&m(v.normalMap.channel),displacementMapUv:Ce&&m(v.displacementMap.channel),emissiveMapUv:Le&&m(v.emissiveMap.channel),metalnessMapUv:Ge&&m(v.metalnessMap.channel),roughnessMapUv:at&&m(v.roughnessMap.channel),anisotropyMapUv:J&&m(v.anisotropyMap.channel),clearcoatMapUv:le&&m(v.clearcoatMap.channel),clearcoatNormalMapUv:ue&&m(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:j&&m(v.clearcoatRoughnessMap.channel),iridescenceMapUv:ee&&m(v.iridescenceMap.channel),iridescenceThicknessMapUv:he&&m(v.iridescenceThicknessMap.channel),sheenColorMapUv:Ie&&m(v.sheenColorMap.channel),sheenRoughnessMapUv:me&&m(v.sheenRoughnessMap.channel),specularMapUv:de&&m(v.specularMap.channel),specularColorMapUv:Pe&&m(v.specularColorMap.channel),specularIntensityMapUv:Fe&&m(v.specularIntensityMap.channel),transmissionMapUv:We&&m(v.transmissionMap.channel),thicknessMapUv:F&&m(v.thicknessMap.channel),alphaMapUv:Q&&m(v.alphaMap.channel),vertexTangents:!!T.attributes.tangent&&(oe||N),vertexNormals:!!T.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!T.attributes.color&&T.attributes.color.itemSize===4,pointsUvs:P.isPoints===!0&&!!T.attributes.uv&&(Ye||Q),fog:!!b,useFog:v.fog===!0,fogExp2:!!b&&b.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||T.attributes.normal===void 0&&oe===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:be,skinning:P.isSkinnedMesh===!0,hasPositionAttribute:T.attributes.position!==void 0,morphTargets:T.morphAttributes.position!==void 0,morphNormals:T.morphAttributes.normal!==void 0,morphColors:T.morphAttributes.color!==void 0,morphTargetsCount:De,morphTextureStride:Re,numSunLights:R.sun.length,numDirLights:R.directional.length,numPointLights:R.point.length,numSpotLights:R.spot.length,numSpotLightMaps:R.spotLightMap.length,numRectAreaLights:R.rectArea.length,numHemiLights:R.hemi.length,numSunLightShadows:R.sunShadowMap.length,numDirLightShadows:R.directionalShadowMap.length,numPointLightShadows:R.pointShadowMap.length,numSpotLightShadows:R.spotShadowMap.length,numSpotLightShadowsWithMaps:R.numSpotLightShadowsWithMaps,numLightProbes:R.numLightProbes,numLightProbeGrids:X.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:n.shadowMap.enabled&&D.length>0,shadowMapType:n.shadowMap.type,toneMapping:Ne,decodeVideoTexture:Ye&&v.map.isVideoTexture===!0&&ot.getTransfer(v.map.colorSpace)===dt,decodeVideoTextureEmissive:Le&&v.emissiveMap.isVideoTexture===!0&&ot.getTransfer(v.emissiveMap.colorSpace)===dt,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===jt,flipSided:v.side===Jt,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:ae&&v.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ae&&v.extensions.multiDraw===!0||ce)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return Te.vertexUv1s=l.has(1),Te.vertexUv2s=l.has(2),Te.vertexUv3s=l.has(3),l.clear(),Te}function g(v){let R=[];if(v.shaderID?R.push(v.shaderID):(R.push(v.customVertexShaderID),R.push(v.customFragmentShaderID)),v.defines!==void 0)for(let D in v.defines)R.push(D),R.push(v.defines[D]);return v.isRawShaderMaterial===!1&&(f(R,v),M(R,v),R.push(n.outputColorSpace)),R.push(v.customProgramCacheKey),R.join()}function f(v,R){v.push(R.precision),v.push(R.outputColorSpace),v.push(R.envMapMode),v.push(R.envMapCubeUVHeight),v.push(R.mapUv),v.push(R.alphaMapUv),v.push(R.lightMapUv),v.push(R.aoMapUv),v.push(R.bumpMapUv),v.push(R.normalMapUv),v.push(R.displacementMapUv),v.push(R.emissiveMapUv),v.push(R.metalnessMapUv),v.push(R.roughnessMapUv),v.push(R.anisotropyMapUv),v.push(R.clearcoatMapUv),v.push(R.clearcoatNormalMapUv),v.push(R.clearcoatRoughnessMapUv),v.push(R.iridescenceMapUv),v.push(R.iridescenceThicknessMapUv),v.push(R.sheenColorMapUv),v.push(R.sheenRoughnessMapUv),v.push(R.specularMapUv),v.push(R.specularColorMapUv),v.push(R.specularIntensityMapUv),v.push(R.transmissionMapUv),v.push(R.thicknessMapUv),v.push(R.combine),v.push(R.fogExp2),v.push(R.sizeAttenuation),v.push(R.morphTargetsCount),v.push(R.morphAttributeCount),v.push(R.numSunLights),v.push(R.numDirLights),v.push(R.numPointLights),v.push(R.numSpotLights),v.push(R.numSpotLightMaps),v.push(R.numHemiLights),v.push(R.numRectAreaLights),v.push(R.numSunLightShadows),v.push(R.numDirLightShadows),v.push(R.numPointLightShadows),v.push(R.numSpotLightShadows),v.push(R.numSpotLightShadowsWithMaps),v.push(R.numLightProbes),v.push(R.shadowMapType),v.push(R.toneMapping),v.push(R.numClippingPlanes),v.push(R.numClipIntersection),v.push(R.depthPacking)}function M(v,R){a.disableAll(),R.instancing&&a.enable(0),R.instancingColor&&a.enable(1),R.instancingMorph&&a.enable(2),R.matcap&&a.enable(3),R.envMap&&a.enable(4),R.normalMapObjectSpace&&a.enable(5),R.normalMapTangentSpace&&a.enable(6),R.clearcoat&&a.enable(7),R.iridescence&&a.enable(8),R.alphaTest&&a.enable(9),R.vertexColors&&a.enable(10),R.vertexAlphas&&a.enable(11),R.vertexUv1s&&a.enable(12),R.vertexUv2s&&a.enable(13),R.vertexUv3s&&a.enable(14),R.vertexTangents&&a.enable(15),R.anisotropy&&a.enable(16),R.alphaHash&&a.enable(17),R.batching&&a.enable(18),R.dispersion&&a.enable(19),R.retroreflection&&a.enable(24),R.batchingColor&&a.enable(20),R.gradientMap&&a.enable(21),R.packedNormalMap&&a.enable(22),R.vertexNormals&&a.enable(23),v.push(a.mask),a.disableAll(),R.fog&&a.enable(0),R.useFog&&a.enable(1),R.flatShading&&a.enable(2),R.logarithmicDepthBuffer&&a.enable(3),R.reversedDepthBuffer&&a.enable(4),R.skinning&&a.enable(5),R.morphTargets&&a.enable(6),R.morphNormals&&a.enable(7),R.morphColors&&a.enable(8),R.premultipliedAlpha&&a.enable(9),R.shadowMapEnabled&&a.enable(10),R.doubleSided&&a.enable(11),R.flipSided&&a.enable(12),R.useDepthPacking&&a.enable(13),R.dithering&&a.enable(14),R.transmission&&a.enable(15),R.sheen&&a.enable(16),R.opaque&&a.enable(17),R.pointsUvs&&a.enable(18),R.decodeVideoTexture&&a.enable(19),R.decodeVideoTextureEmissive&&a.enable(20),R.alphaToCoverage&&a.enable(21),R.numLightProbeGrids>0&&a.enable(22),R.hasPositionAttribute&&a.enable(23),v.push(a.mask)}function C(v){let R=p[v.type],D;if(R){let O=Hn[R];D=gd.clone(O.uniforms)}else D=v.uniforms;return D}function S(v,R){let D=u.get(R);return D!==void 0?++D.usedTimes:(D=new uv(n,R,v,s),c.push(D),u.set(R,D)),D}function E(v){if(--v.usedTimes===0){let R=c.indexOf(v);c[R]=c[c.length-1],c.pop(),u.delete(v.cacheKey),v.destroy()}}function w(v){o.remove(v)}function I(){o.dispose()}return{getParameters:y,getProgramCacheKey:g,getUniforms:C,acquireProgram:S,releaseProgram:E,releaseShaderCache:w,programs:c,dispose:I}}function pv(){let n=new WeakMap;function e(a){return n.has(a)}function t(a){let o=n.get(a);return o===void 0&&(o={},n.set(a,o)),o}function i(a){n.delete(a)}function s(a,o,l){n.get(a)[o]=l}function r(){n=new WeakMap}return{has:e,get:t,remove:i,update:s,dispose:r}}function mv(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.materialVariant!==e.materialVariant?n.materialVariant-e.materialVariant:n.z!==e.z?n.z-e.z:n.id-e.id}function Fd(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Od(){let n=[],e=0,t=[],i=[],s=[];function r(){e=0,t.length=0,i.length=0,s.length=0}function a(h){let p=0;return h.isInstancedMesh&&(p+=2),h.isSkinnedMesh&&(p+=1),p}function o(h,p,m,y,g,f){let M=n[e];return M===void 0?(M={id:h.id,object:h,geometry:p,material:m,materialVariant:a(h),groupOrder:y,renderOrder:h.renderOrder,z:g,group:f},n[e]=M):(M.id=h.id,M.object=h,M.geometry=p,M.material=m,M.materialVariant=a(h),M.groupOrder=y,M.renderOrder=h.renderOrder,M.z=g,M.group=f),e++,M}function l(h,p,m,y,g,f,M){M.reversedDepth===!0&&(g=-g);let C=o(h,p,m,y,g,f);m.transmission>0?i.push(C):m.transparent===!0?s.push(C):t.push(C)}function c(h,p,m,y,g,f){let M=o(h,p,m,y,g,f);m.transmission>0?i.unshift(M):m.transparent===!0?s.unshift(M):t.unshift(M)}function u(h,p){t.length>1&&t.sort(h||mv),i.length>1&&i.sort(p||Fd),s.length>1&&s.sort(p||Fd)}function d(){for(let h=e,p=n.length;h<p;h++){let m=n[h];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:i,transparent:s,init:r,push:l,unshift:c,finish:d,sort:u}}function gv(){let n=new WeakMap;function e(i,s){let r=n.get(i),a;return r===void 0?(a=new Od,n.set(i,[a])):s>=r.length?(a=new Od,r.push(a)):a=r[s],a}function t(){n=new WeakMap}return{get:e,dispose:t}}function _v(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={direction:new U,color:new tt};break;case"SpotLight":t={position:new U,direction:new U,color:new tt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new U,color:new tt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new U,skyColor:new tt,groundColor:new tt};break;case"RectAreaLight":t={color:new tt,position:new U,halfWidth:new U,halfHeight:new U};break}return n[e.id]=t,t}}}function vv(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Be};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Be};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Be,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}var xv=0;function yv(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function bv(n){let e=new _v,t=vv(),i={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new U);let s=new U,r=new Et,a=new Et;function o(c){let u=0,d=0,h=0;for(let P=0;P<9;P++)i.probe[P].set(0,0,0);let p=0,m=0,y=0,g=0,f=0,M=0,C=0,S=0,E=0,w=0,I=0,v=0,R=0,D=0;c.sort(yv);for(let P=0,X=c.length;P<X;P++){let b=c[P],T=b.color,k=b.intensity,V=b.distance,re=null;if(b.shadow&&b.shadow.map&&(b.shadow.map.texture.format===Ai?re=b.shadow.map.texture:re=b.shadow.map.depthTexture||b.shadow.map.texture),b.isAmbientLight)u+=T.r*k,d+=T.g*k,h+=T.b*k;else if(b.isLightProbe){for(let Z=0;Z<9;Z++)i.probe[Z].addScaledVector(b.sh.coefficients[Z],k);D++}else if(b.isSunLight){let Z=e.get(b);if(Z.color.copy(b.color).multiplyScalar(b.intensity),b.castShadow){let ne=b.shadow,se=t.get(b);se.shadowIntensity=ne.intensity,se.shadowBias=ne.bias,se.shadowNormalBias=ne.normalBias,se.shadowRadius=ne.radius,se.shadowMapSize.copy(ne.mapSize).multiply(ne.getFrameExtents()),i.sunShadow[m]=se,i.sunShadowMap[m]=re;let De=ne.getViewportCount();for(let Re=0;Re<De;Re++)i.sunShadowMatrix[y+Re]=ne.getMatrix(Re),i.sunShadowCascade[y+Re]=ne._cascadeData[Re];y+=De,m++}i.sun[p]=Z,p++}else if(b.isDirectionalLight){let Z=e.get(b);if(Z.color.copy(b.color).multiplyScalar(b.intensity),b.castShadow){let ne=b.shadow,se=t.get(b);se.shadowIntensity=ne.intensity,se.shadowBias=ne.bias,se.shadowNormalBias=ne.normalBias,se.shadowRadius=ne.radius,se.shadowMapSize=ne.mapSize,i.directionalShadow[g]=se,i.directionalShadowMap[g]=re,i.directionalShadowMatrix[g]=b.shadow.matrix,E++}i.directional[g]=Z,g++}else if(b.isSpotLight){let Z=e.get(b);Z.position.setFromMatrixPosition(b.matrixWorld),Z.color.copy(T).multiplyScalar(k),Z.distance=V,Z.coneCos=Math.cos(b.angle),Z.penumbraCos=Math.cos(b.angle*(1-b.penumbra)),Z.decay=b.decay,i.spot[M]=Z;let ne=b.shadow;if(b.map&&(i.spotLightMap[v]=b.map,v++,ne.updateMatrices(b),b.castShadow&&R++),i.spotLightMatrix[M]=ne.matrix,b.castShadow){let se=t.get(b);se.shadowIntensity=ne.intensity,se.shadowBias=ne.bias,se.shadowNormalBias=ne.normalBias,se.shadowRadius=ne.radius,se.shadowMapSize=ne.mapSize,i.spotShadow[M]=se,i.spotShadowMap[M]=re,I++}M++}else if(b.isRectAreaLight){let Z=e.get(b);Z.color.copy(T).multiplyScalar(k),Z.halfWidth.set(b.width*.5,0,0),Z.halfHeight.set(0,b.height*.5,0),i.rectArea[C]=Z,C++}else if(b.isPointLight){let Z=e.get(b);if(Z.color.copy(b.color).multiplyScalar(b.intensity),Z.distance=b.distance,Z.decay=b.decay,b.castShadow){let ne=b.shadow,se=t.get(b);se.shadowIntensity=ne.intensity,se.shadowBias=ne.bias,se.shadowNormalBias=ne.normalBias,se.shadowRadius=ne.radius,se.shadowMapSize=ne.mapSize,se.shadowCameraNear=ne.camera.near,se.shadowCameraFar=ne.camera.far,i.pointShadow[f]=se,i.pointShadowMap[f]=re,i.pointShadowMatrix[f]=b.shadow.matrix,w++}i.point[f]=Z,f++}else if(b.isHemisphereLight){let Z=e.get(b);Z.skyColor.copy(b.color).multiplyScalar(k),Z.groundColor.copy(b.groundColor).multiplyScalar(k),i.hemi[S]=Z,S++}}C>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ge.LTC_FLOAT_1,i.rectAreaLTC2=ge.LTC_FLOAT_2):(i.rectAreaLTC1=ge.LTC_HALF_1,i.rectAreaLTC2=ge.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=d,i.ambient[2]=h;let O=i.hash;(O.sunLength!==p||O.directionalLength!==g||O.pointLength!==f||O.spotLength!==M||O.rectAreaLength!==C||O.hemiLength!==S||O.numSunShadows!==m||O.numDirectionalShadows!==E||O.numPointShadows!==w||O.numSpotShadows!==I||O.numSpotMaps!==v||O.numLightProbes!==D)&&(i.sun.length=p,i.directional.length=g,i.spot.length=M,i.rectArea.length=C,i.point.length=f,i.hemi.length=S,i.sunShadow.length=m,i.sunShadowMap.length=m,i.sunShadowMatrix.length=y,i.sunShadowCascade.length=y,i.directionalShadow.length=E,i.directionalShadowMap.length=E,i.directionalShadowMatrix.length=E,i.pointShadow.length=w,i.pointShadowMap.length=w,i.pointShadowMatrix.length=w,i.spotShadow.length=I,i.spotShadowMap.length=I,i.spotLightMatrix.length=I+v-R,i.spotLightMap.length=v,i.numSpotLightShadowsWithMaps=R,i.numLightProbes=D,O.sunLength=p,O.directionalLength=g,O.pointLength=f,O.spotLength=M,O.rectAreaLength=C,O.hemiLength=S,O.numSunShadows=m,O.numDirectionalShadows=E,O.numPointShadows=w,O.numSpotShadows=I,O.numSpotMaps=v,O.numLightProbes=D,i.version=xv++)}function l(c,u){let d=0,h=0,p=0,m=0,y=0,g=0,f=u.matrixWorldInverse;for(let M=0,C=c.length;M<C;M++){let S=c[M];if(S.isSunLight){let E=i.sun[d];E.direction.setFromMatrixPosition(S.matrixWorld),E.direction.transformDirection(f),d++}else if(S.isDirectionalLight){let E=i.directional[h];E.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(f),h++}else if(S.isSpotLight){let E=i.spot[m];E.position.setFromMatrixPosition(S.matrixWorld),E.position.applyMatrix4(f),E.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(f),m++}else if(S.isRectAreaLight){let E=i.rectArea[y];E.position.setFromMatrixPosition(S.matrixWorld),E.position.applyMatrix4(f),a.identity(),r.copy(S.matrixWorld),r.premultiply(f),a.extractRotation(r),E.halfWidth.set(S.width*.5,0,0),E.halfHeight.set(0,S.height*.5,0),E.halfWidth.applyMatrix4(a),E.halfHeight.applyMatrix4(a),y++}else if(S.isPointLight){let E=i.point[p];E.position.setFromMatrixPosition(S.matrixWorld),E.position.applyMatrix4(f),p++}else if(S.isHemisphereLight){let E=i.hemi[g];E.direction.setFromMatrixPosition(S.matrixWorld),E.direction.transformDirection(f),g++}}}return{setup:o,setupView:l,state:i}}function kd(n){let e=new bv(n),t=[],i=[],s=[];function r(h){d.camera=h,t.length=0,i.length=0,s.length=0}function a(h){t.push(h)}function o(h){i.push(h)}function l(h){s.push(h)}function c(){e.setup(t)}function u(h){e.setupView(t,h)}let d={lightsArray:t,shadowsArray:i,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:u,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function Sv(n){let e=new WeakMap;function t(s,r=0){let a=e.get(s),o;return a===void 0?(o=new kd(n),e.set(s,[o])):r>=a.length?(o=new kd(n),a.push(o)):o=a[r],o}function i(){e=new WeakMap}return{get:t,dispose:i}}var Mv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Ev=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Tv=[new U(1,0,0),new U(-1,0,0),new U(0,1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1)],wv=[new U(0,-1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1),new U(0,-1,0),new U(0,-1,0)],Bd=new Et,Cr=new U,qc=new U;function Av(n,e,t){let i=new Ss,s=new Be,r=new Be,a=new Tt,o=new Ba,l=new za,c={},u=t.maxTextureSize,d={[Mi]:Jt,[Jt]:Mi,[jt]:jt},h=new pn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Be},radius:{value:4}},vertexShader:Mv,fragmentShader:Ev}),p=h.clone();p.defines.HORIZONTAL_PASS=1;let m=new $t;m.setAttribute("position",new kt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new Vt(m,h),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=vr;let f=this.type;this.render=function(w,I,v){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||w.length===0)return;this.type===Dh&&(Ue("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=vr);let R=n.getRenderTarget(),D=n.getActiveCubeFace(),O=n.getActiveMipmapLevel(),P=n.state;P.setBlending(zn),P.buffers.depth.getReversed()===!0?P.buffers.color.setClear(0,0,0,0):P.buffers.color.setClear(1,1,1,1),P.buffers.depth.setTest(!0),P.setScissorTest(!1);let X=f!==this.type;X&&I.traverse(function(b){b.material&&(Array.isArray(b.material)?b.material.forEach(T=>T.needsUpdate=!0):b.material.needsUpdate=!0)});for(let b=0,T=w.length;b<T;b++){let k=w[b],V=k.shadow;if(V===void 0){Ue("WebGLShadowMap:",k,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;s.copy(V.mapSize);let re=V.getFrameExtents();s.multiply(re),r.copy(V.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/re.x),s.x=r.x*re.x,V.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/re.y),s.y=r.y*re.y,V.mapSize.y=r.y));let Z=n.state.buffers.depth.getReversed();if(V.camera._reversedDepth=Z,V.map===null||X===!0){if(V.map!==null&&(V.map.depthTexture!==null&&(V.map.depthTexture.dispose(),V.map.depthTexture=null),V.map.dispose()),this.type===Rs){if(k.isPointLight){Ue("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}V.map=new nn(s.x,s.y,{format:Ai,type:In,minFilter:Bt,magFilter:Bt,generateMipmaps:!1}),V.map.texture.name=k.name+".shadowMap",V.map.depthTexture=new mi(s.x,s.y,Cn),V.map.depthTexture.name=k.name+".shadowMapDepth",V.map.depthTexture.format=Bn,V.map.depthTexture.compareFunction=null,V.map.depthTexture.minFilter=Ot,V.map.depthTexture.magFilter=Ot}else k.isPointLight?(V.map=new qo(s.x),V.map.depthTexture=new Oa(s.x,Rn)):(V.map=new nn(s.x,s.y),V.map.depthTexture=new mi(s.x,s.y,Rn)),V.map.depthTexture.name=k.name+".shadowMap",V.map.depthTexture.format=Bn,this.type===vr?(V.map.depthTexture.compareFunction=Z?Ho:Vo,V.map.depthTexture.minFilter=Bt,V.map.depthTexture.magFilter=Bt):(V.map.depthTexture.compareFunction=null,V.map.depthTexture.minFilter=Ot,V.map.depthTexture.magFilter=Ot);V.camera.updateProjectionMatrix()}V.map.isWebGLCubeRenderTarget!==!0&&(V.map.width!==s.x||V.map.height!==s.y)&&V.map.setSize(s.x,s.y);let ne=V.map.isWebGLCubeRenderTarget?6:V.getViewportCount();k.isPointLight!==!0&&V.updateMatrices(k,v);for(let se=0;se<ne;se++){let De=V.getCamera(se);if(k.isPointLight){let Re=V.camera,mt=V.matrix,nt=k.distance||Re.far;nt!==Re.far&&(Re.far=nt,Re.updateProjectionMatrix()),Cr.setFromMatrixPosition(k.matrixWorld),Re.position.copy(Cr),qc.copy(Re.position),qc.add(Tv[se]),Re.up.copy(wv[se]),Re.lookAt(qc),Re.updateMatrixWorld(),mt.makeTranslation(-Cr.x,-Cr.y,-Cr.z),Bd.multiplyMatrices(Re.projectionMatrix,Re.matrixWorldInverse),V._frustum.setFromProjectionMatrix(Bd,Re.coordinateSystem,Re.reversedDepth)}if(V.map.isWebGLCubeRenderTarget)n.setRenderTarget(V.map,se),n.clear();else{se===0&&(n.setRenderTarget(V.map),n.clear());let Re=V.getViewport(se);a.set(r.x*Re.x,r.y*Re.y,r.x*Re.z,r.y*Re.w),P.viewport(a)}i=V.getFrustum(se),S(I,v,De,k,this.type)}V.isPointLightShadow!==!0&&this.type===Rs&&M(V,v),V.needsUpdate=!1}f=this.type,g.needsUpdate=!1,n.setRenderTarget(R,D,O)};function M(w,I){let v=e.update(y);h.defines.VSM_SAMPLES!==w.blurSamples&&(h.defines.VSM_SAMPLES=w.blurSamples,p.defines.VSM_SAMPLES=w.blurSamples,h.needsUpdate=!0,p.needsUpdate=!0),w.mapPass===null?w.mapPass=new nn(s.x,s.y,{format:Ai,type:In}):(w.mapPass.width!==w.map.width||w.mapPass.height!==w.map.height)&&w.mapPass.setSize(w.map.width,w.map.height),h.uniforms.shadow_pass.value=w.map.depthTexture,h.uniforms.resolution.value.set(w.map.width,w.map.height),h.uniforms.radius.value=w.radius,n.setRenderTarget(w.mapPass),n.clear(),n.renderBufferDirect(I,null,v,h,y,null),p.uniforms.shadow_pass.value=w.mapPass.texture,p.uniforms.resolution.value.set(w.map.width,w.map.height),p.uniforms.radius.value=w.radius,n.setRenderTarget(w.map),n.clear(),n.renderBufferDirect(I,null,v,p,y,null)}function C(w,I,v,R){let D=null,O=v.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(O!==void 0)D=O;else if(D=v.isPointLight===!0?l:o,n.localClippingEnabled&&I.clipShadows===!0&&Array.isArray(I.clippingPlanes)&&I.clippingPlanes.length!==0||I.displacementMap&&I.displacementScale!==0||I.alphaMap&&I.alphaTest>0||I.map&&I.alphaTest>0||I.alphaToCoverage===!0){let P=D.uuid,X=I.uuid,b=c[P];b===void 0&&(b={},c[P]=b);let T=b[X];T===void 0&&(T=D.clone(),b[X]=T,I.addEventListener("dispose",E)),D=T}if(D.visible=I.visible,D.wireframe=I.wireframe,R===Rs?D.side=I.shadowSide!==null?I.shadowSide:I.side:D.side=I.shadowSide!==null?I.shadowSide:d[I.side],D.alphaMap=I.alphaMap,D.alphaTest=I.alphaToCoverage===!0?.5:I.alphaTest,D.map=I.map,D.clipShadows=I.clipShadows,D.clippingPlanes=I.clippingPlanes,D.clipIntersection=I.clipIntersection,D.displacementMap=I.displacementMap,D.displacementScale=I.displacementScale,D.displacementBias=I.displacementBias,D.wireframeLinewidth=I.wireframeLinewidth,D.linewidth=I.linewidth,v.isPointLight===!0&&D.isMeshDistanceMaterial===!0){let P=n.properties.get(D);P.light=v}return D}function S(w,I,v,R,D){if(w.visible===!1)return;if(w.layers.test(I.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&D===Rs)&&(!w.frustumCulled||w.intersectsFrustum(i))){w.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,w.matrixWorld);let X=e.update(w),b=w.material;if(Array.isArray(b)){let T=X.groups;for(let k=0,V=T.length;k<V;k++){let re=T[k],Z=b[re.materialIndex];if(Z&&Z.visible){let ne=C(w,Z,R,D);w.onBeforeShadow(n,w,I,v,X,ne,re),n.renderBufferDirect(v,null,X,ne,w,re),w.onAfterShadow(n,w,I,v,X,ne,re)}}}else if(b.visible){let T=C(w,b,R,D);w.onBeforeShadow(n,w,I,v,X,T,null),n.renderBufferDirect(v,null,X,T,w,null),w.onAfterShadow(n,w,I,v,X,T,null)}}let P=w.children;for(let X=0,b=P.length;X<b;X++)S(P[X],I,v,R,D)}function E(w){w.target.removeEventListener("dispose",E);for(let v in c){let R=c[v],D=w.target.uuid;D in R&&(R[D].dispose(),delete R[D])}}}function Rv(n,e){function t(){let F=!1,fe=new Tt,Q=null,pe=new Tt(0,0,0,0);return{setMask:function(xe){Q!==xe&&!F&&(n.colorMask(xe,xe,xe,xe),Q=xe)},setLocked:function(xe){F=xe},setClear:function(xe,ae,Ne,Te,xt){xt===!0&&(xe*=Te,ae*=Te,Ne*=Te),fe.set(xe,ae,Ne,Te),pe.equals(fe)===!1&&(n.clearColor(xe,ae,Ne,Te),pe.copy(fe))},reset:function(){F=!1,Q=null,pe.set(-1,0,0,0)}}}function i(){let F=!1,fe=!1,Q=null,pe=null,xe=null;return{setReversed:function(ae){if(fe!==ae){let Ne=e.get("EXT_clip_control");ae?Ne.clipControlEXT(Ne.LOWER_LEFT_EXT,Ne.ZERO_TO_ONE_EXT):Ne.clipControlEXT(Ne.LOWER_LEFT_EXT,Ne.NEGATIVE_ONE_TO_ONE_EXT),fe=ae;let Te=xe;xe=null,this.setClear(Te)}},getReversed:function(){return fe},setTest:function(ae){ae?te(n.DEPTH_TEST):be(n.DEPTH_TEST)},setMask:function(ae){Q!==ae&&!F&&(n.depthMask(ae),Q=ae)},setFunc:function(ae){if(fe&&(ae=pd[ae]),pe!==ae){switch(ae){case ya:n.depthFunc(n.NEVER);break;case ba:n.depthFunc(n.ALWAYS);break;case Sa:n.depthFunc(n.LESS);break;case gs:n.depthFunc(n.LEQUAL);break;case Ma:n.depthFunc(n.EQUAL);break;case Ea:n.depthFunc(n.GEQUAL);break;case Ta:n.depthFunc(n.GREATER);break;case wa:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}pe=ae}},setLocked:function(ae){F=ae},setClear:function(ae){xe!==ae&&(xe=ae,fe&&(ae=1-ae),n.clearDepth(ae))},reset:function(){F=!1,Q=null,pe=null,xe=null,fe=!1}}}function s(){let F=!1,fe=null,Q=null,pe=null,xe=null,ae=null,Ne=null,Te=null,xt=null;return{setTest:function(ut){F||(ut?te(n.STENCIL_TEST):be(n.STENCIL_TEST))},setMask:function(ut){fe!==ut&&!F&&(n.stencilMask(ut),fe=ut)},setFunc:function(ut,bn,Dn){(Q!==ut||pe!==bn||xe!==Dn)&&(n.stencilFunc(ut,bn,Dn),Q=ut,pe=bn,xe=Dn)},setOp:function(ut,bn,Dn){(ae!==ut||Ne!==bn||Te!==Dn)&&(n.stencilOp(ut,bn,Dn),ae=ut,Ne=bn,Te=Dn)},setLocked:function(ut){F=ut},setClear:function(ut){xt!==ut&&(n.clearStencil(ut),xt=ut)},reset:function(){F=!1,fe=null,Q=null,pe=null,xe=null,ae=null,Ne=null,Te=null,xt=null}}}let r=new t,a=new i,o=new s,l=new WeakMap,c=new WeakMap,u={},d={},h={},p=new WeakMap,m=[],y=null,g=!1,f=null,M=null,C=null,S=null,E=null,w=null,I=null,v=new tt(0,0,0),R=0,D=!1,O=null,P=null,X=null,b=null,T=null,k=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS),V=!1,re=0,Z=n.getParameter(n.VERSION);Z.indexOf("WebGL")!==-1?(re=parseFloat(/^WebGL (\d)/.exec(Z)[1]),V=re>=1):Z.indexOf("OpenGL ES")!==-1&&(re=parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]),V=re>=2);let ne=null,se={},De=n.getParameter(n.SCISSOR_BOX),Re=n.getParameter(n.VIEWPORT),mt=new Tt().fromArray(De),nt=new Tt().fromArray(Re);function lt(F,fe,Q,pe){let xe=new Uint8Array(4),ae=n.createTexture();n.bindTexture(F,ae),n.texParameteri(F,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(F,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Ne=0;Ne<Q;Ne++)F===n.TEXTURE_3D||F===n.TEXTURE_2D_ARRAY?n.texImage3D(fe,0,n.RGBA,1,1,pe,0,n.RGBA,n.UNSIGNED_BYTE,xe):n.texImage2D(fe+Ne,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,xe);return ae}let K={};K[n.TEXTURE_2D]=lt(n.TEXTURE_2D,n.TEXTURE_2D,1),K[n.TEXTURE_CUBE_MAP]=lt(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),K[n.TEXTURE_2D_ARRAY]=lt(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),K[n.TEXTURE_3D]=lt(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),te(n.DEPTH_TEST),a.setFunc(gs),Qe(!1),oe(dc),te(n.CULL_FACE),it(zn);function te(F){u[F]!==!0&&(n.enable(F),u[F]=!0)}function be(F){u[F]!==!1&&(n.disable(F),u[F]=!1)}function ze(F,fe){return h[F]!==fe?(n.bindFramebuffer(F,fe),h[F]=fe,F===n.DRAW_FRAMEBUFFER&&(h[n.FRAMEBUFFER]=fe),F===n.FRAMEBUFFER&&(h[n.DRAW_FRAMEBUFFER]=fe),!0):!1}function ce(F,fe){let Q=m,pe=!1;if(F){Q=p.get(fe),Q===void 0&&(Q=[],p.set(fe,Q));let xe=F.textures;if(Q.length!==xe.length||Q[0]!==n.COLOR_ATTACHMENT0){for(let ae=0,Ne=xe.length;ae<Ne;ae++)Q[ae]=n.COLOR_ATTACHMENT0+ae;Q.length=xe.length,pe=!0}}else Q[0]!==n.BACK&&(Q[0]=n.BACK,pe=!0);pe&&n.drawBuffers(Q)}function Ye(F){return y!==F?(n.useProgram(F),y=F,!0):!1}let Mt={[zi]:n.FUNC_ADD,[Uh]:n.FUNC_SUBTRACT,[Fh]:n.FUNC_REVERSE_SUBTRACT};Mt[Oh]=n.MIN,Mt[kh]=n.MAX;let Ze={[Bh]:n.ZERO,[zh]:n.ONE,[Vh]:n.SRC_COLOR,[gc]:n.SRC_ALPHA,[$h]:n.SRC_ALPHA_SATURATE,[Xh]:n.DST_COLOR,[Gh]:n.DST_ALPHA,[Hh]:n.ONE_MINUS_SRC_COLOR,[_c]:n.ONE_MINUS_SRC_ALPHA,[qh]:n.ONE_MINUS_DST_COLOR,[Wh]:n.ONE_MINUS_DST_ALPHA,[Yh]:n.CONSTANT_COLOR,[Zh]:n.ONE_MINUS_CONSTANT_COLOR,[Kh]:n.CONSTANT_ALPHA,[Jh]:n.ONE_MINUS_CONSTANT_ALPHA};function it(F,fe,Q,pe,xe,ae,Ne,Te,xt,ut){if(F===zn){g===!0&&(be(n.BLEND),g=!1);return}if(g===!1&&(te(n.BLEND),g=!0),F!==Lh){if(F!==f||ut!==D){if((M!==zi||E!==zi)&&(n.blendEquation(n.FUNC_ADD),M=zi,E=zi),ut)switch(F){case Cs:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case fc:n.blendFunc(n.ONE,n.ONE);break;case pc:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case mc:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:ke("WebGLState: Invalid blending: ",F);break}else switch(F){case Cs:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case fc:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case pc:ke("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case mc:ke("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:ke("WebGLState: Invalid blending: ",F);break}C=null,S=null,w=null,I=null,v.set(0,0,0),R=0,f=F,D=ut}return}xe=xe||fe,ae=ae||Q,Ne=Ne||pe,(fe!==M||xe!==E)&&(n.blendEquationSeparate(Mt[fe],Mt[xe]),M=fe,E=xe),(Q!==C||pe!==S||ae!==w||Ne!==I)&&(n.blendFuncSeparate(Ze[Q],Ze[pe],Ze[ae],Ze[Ne]),C=Q,S=pe,w=ae,I=Ne),(Te.equals(v)===!1||xt!==R)&&(n.blendColor(Te.r,Te.g,Te.b,xt),v.copy(Te),R=xt),f=F,D=!1}function gt(F,fe){F.side===jt?be(n.CULL_FACE):te(n.CULL_FACE);let Q=F.side===Jt;fe&&(Q=!Q),Qe(Q),F.blending===Cs&&F.transparent===!1?it(zn):it(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),a.setFunc(F.depthFunc),a.setTest(F.depthTest),a.setMask(F.depthWrite),r.setMask(F.colorWrite);let pe=F.stencilWrite;o.setTest(pe),pe&&(o.setMask(F.stencilWriteMask),o.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),o.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),Le(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?te(n.SAMPLE_ALPHA_TO_COVERAGE):be(n.SAMPLE_ALPHA_TO_COVERAGE)}function Qe(F){O!==F&&(F?n.frontFace(n.CW):n.frontFace(n.CCW),O=F)}function oe(F){F!==Ph?(te(n.CULL_FACE),F!==P&&(F===dc?n.cullFace(n.BACK):F===Nh?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):be(n.CULL_FACE),P=F}function Ce(F){F!==X&&(V&&n.lineWidth(F),X=F)}function Le(F,fe,Q){F?(te(n.POLYGON_OFFSET_FILL),(b!==fe||T!==Q)&&(b=fe,T=Q,a.getReversed()&&(fe=-fe),n.polygonOffset(fe,Q))):be(n.POLYGON_OFFSET_FILL)}function Ge(F){F?te(n.SCISSOR_TEST):be(n.SCISSOR_TEST)}function at(F){F===void 0&&(F=n.TEXTURE0+k-1),ne!==F&&(n.activeTexture(F),ne=F)}function N(F,fe,Q){Q===void 0&&(ne===null?Q=n.TEXTURE0+k-1:Q=ne);let pe=se[Q];pe===void 0&&(pe={type:void 0,texture:void 0},se[Q]=pe),(pe.type!==F||pe.texture!==fe)&&(ne!==Q&&(n.activeTexture(Q),ne=Q),n.bindTexture(F,fe||K[F]),pe.type=F,pe.texture=fe)}function ft(){let F=se[ne];F!==void 0&&F.type!==void 0&&(n.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function qe(){try{n.compressedTexImage2D(...arguments)}catch(F){ke("WebGLState:",F)}}function A(){try{n.compressedTexImage3D(...arguments)}catch(F){ke("WebGLState:",F)}}function _(){try{n.texSubImage2D(...arguments)}catch(F){ke("WebGLState:",F)}}function B(){try{n.texSubImage3D(...arguments)}catch(F){ke("WebGLState:",F)}}function W(){try{n.compressedTexSubImage2D(...arguments)}catch(F){ke("WebGLState:",F)}}function J(){try{n.compressedTexSubImage3D(...arguments)}catch(F){ke("WebGLState:",F)}}function le(){try{n.texStorage2D(...arguments)}catch(F){ke("WebGLState:",F)}}function ue(){try{n.texStorage3D(...arguments)}catch(F){ke("WebGLState:",F)}}function j(){try{n.texImage2D(...arguments)}catch(F){ke("WebGLState:",F)}}function ee(){try{n.texImage3D(...arguments)}catch(F){ke("WebGLState:",F)}}function he(F){return d[F]!==void 0?d[F]:n.getParameter(F)}function Ie(F,fe){d[F]!==fe&&(n.pixelStorei(F,fe),d[F]=fe)}function me(F){mt.equals(F)===!1&&(n.scissor(F.x,F.y,F.z,F.w),mt.copy(F))}function de(F){nt.equals(F)===!1&&(n.viewport(F.x,F.y,F.z,F.w),nt.copy(F))}function Pe(F,fe){let Q=c.get(fe);Q===void 0&&(Q=new WeakMap,c.set(fe,Q));let pe=Q.get(F);pe===void 0&&(pe=n.getUniformBlockIndex(fe,F.name),Q.set(F,pe))}function Fe(F,fe){let pe=c.get(fe).get(F);l.get(fe)!==pe&&(n.uniformBlockBinding(fe,pe,F.__bindingPointIndex),l.set(fe,pe))}function We(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),a.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),u={},d={},ne=null,se={},h={},p=new WeakMap,m=[],y=null,g=!1,f=null,M=null,C=null,S=null,E=null,w=null,I=null,v=new tt(0,0,0),R=0,D=!1,O=null,P=null,X=null,b=null,T=null,mt.set(0,0,n.canvas.width,n.canvas.height),nt.set(0,0,n.canvas.width,n.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:te,disable:be,bindFramebuffer:ze,drawBuffers:ce,useProgram:Ye,setBlending:it,setMaterial:gt,setFlipSided:Qe,setCullFace:oe,setLineWidth:Ce,setPolygonOffset:Le,setScissorTest:Ge,activeTexture:at,bindTexture:N,unbindTexture:ft,compressedTexImage2D:qe,compressedTexImage3D:A,texImage2D:j,texImage3D:ee,pixelStorei:Ie,getParameter:he,updateUBOMapping:Pe,uniformBlockBinding:Fe,texStorage2D:le,texStorage3D:ue,texSubImage2D:_,texSubImage3D:B,compressedTexSubImage2D:W,compressedTexSubImage3D:J,scissor:me,viewport:de,reset:We}}function Cv(n,e,t,i,s,r,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Be,u=new WeakMap,d=new Set,h,p=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function y(A,_){return m?new OffscreenCanvas(A,_):er("canvas")}function g(A,_,B){let W=1,J=qe(A);if((J.width>B||J.height>B)&&(W=B/Math.max(J.width,J.height)),W<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){let le=Math.floor(W*J.width),ue=Math.floor(W*J.height);h===void 0&&(h=y(le,ue));let j=_?y(le,ue):h;return j.width=le,j.height=ue,j.getContext("2d").drawImage(A,0,0,le,ue),Ue("WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+le+"x"+ue+")."),j}else return"data"in A&&Ue("WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),A;return A}function f(A){return A.generateMipmaps}function M(A){n.generateMipmap(A)}function C(A){return A.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?n.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function S(A,_,B,W,J,le=!1){if(A!==null){if(n[A]!==void 0)return n[A];Ue("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let ue;W&&(ue=e.get("EXT_texture_norm16"),ue||Ue("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let j=_;if(_===n.RED&&(B===n.FLOAT&&(j=n.R32F),B===n.HALF_FLOAT&&(j=n.R16F),B===n.UNSIGNED_BYTE&&(j=n.R8),B===n.UNSIGNED_SHORT&&ue&&(j=ue.R16_EXT),B===n.SHORT&&ue&&(j=ue.R16_SNORM_EXT)),_===n.RED_INTEGER&&(B===n.UNSIGNED_BYTE&&(j=n.R8UI),B===n.UNSIGNED_SHORT&&(j=n.R16UI),B===n.UNSIGNED_INT&&(j=n.R32UI),B===n.BYTE&&(j=n.R8I),B===n.SHORT&&(j=n.R16I),B===n.INT&&(j=n.R32I)),_===n.RG&&(B===n.FLOAT&&(j=n.RG32F),B===n.HALF_FLOAT&&(j=n.RG16F),B===n.UNSIGNED_BYTE&&(j=n.RG8),B===n.UNSIGNED_SHORT&&ue&&(j=ue.RG16_EXT),B===n.SHORT&&ue&&(j=ue.RG16_SNORM_EXT)),_===n.RG_INTEGER&&(B===n.UNSIGNED_BYTE&&(j=n.RG8UI),B===n.UNSIGNED_SHORT&&(j=n.RG16UI),B===n.UNSIGNED_INT&&(j=n.RG32UI),B===n.BYTE&&(j=n.RG8I),B===n.SHORT&&(j=n.RG16I),B===n.INT&&(j=n.RG32I)),_===n.RGB_INTEGER&&(B===n.UNSIGNED_BYTE&&(j=n.RGB8UI),B===n.UNSIGNED_SHORT&&(j=n.RGB16UI),B===n.UNSIGNED_INT&&(j=n.RGB32UI),B===n.BYTE&&(j=n.RGB8I),B===n.SHORT&&(j=n.RGB16I),B===n.INT&&(j=n.RGB32I)),_===n.RGBA_INTEGER&&(B===n.UNSIGNED_BYTE&&(j=n.RGBA8UI),B===n.UNSIGNED_SHORT&&(j=n.RGBA16UI),B===n.UNSIGNED_INT&&(j=n.RGBA32UI),B===n.BYTE&&(j=n.RGBA8I),B===n.SHORT&&(j=n.RGBA16I),B===n.INT&&(j=n.RGBA32I)),_===n.RGB&&(B===n.UNSIGNED_SHORT&&ue&&(j=ue.RGB16_EXT),B===n.SHORT&&ue&&(j=ue.RGB16_SNORM_EXT),B===n.UNSIGNED_INT_5_9_9_9_REV&&(j=n.RGB9_E5),B===n.UNSIGNED_INT_10F_11F_11F_REV&&(j=n.R11F_G11F_B10F)),_===n.RGBA){let ee=le?Qs:ot.getTransfer(J);B===n.FLOAT&&(j=n.RGBA32F),B===n.HALF_FLOAT&&(j=n.RGBA16F),B===n.UNSIGNED_BYTE&&(j=ee===dt?n.SRGB8_ALPHA8:n.RGBA8),B===n.UNSIGNED_SHORT&&ue&&(j=ue.RGBA16_EXT),B===n.SHORT&&ue&&(j=ue.RGBA16_SNORM_EXT),B===n.UNSIGNED_SHORT_4_4_4_4&&(j=n.RGBA4),B===n.UNSIGNED_SHORT_5_5_5_1&&(j=n.RGB5_A1)}return(j===n.R16F||j===n.R32F||j===n.RG16F||j===n.RG32F||j===n.RGBA16F||j===n.RGBA32F)&&e.get("EXT_color_buffer_float"),j}function E(A,_){let B;return A?_===null||_===Rn||_===Ps?B=n.DEPTH24_STENCIL8:_===Cn?B=n.DEPTH32F_STENCIL8:_===Is&&(B=n.DEPTH24_STENCIL8,Ue("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===Rn||_===Ps?B=n.DEPTH_COMPONENT24:_===Cn?B=n.DEPTH_COMPONENT32F:_===Is&&(B=n.DEPTH_COMPONENT16),B}function w(A,_){return f(A)===!0||A.isFramebufferTexture&&A.minFilter!==Ot&&A.minFilter!==Bt?Math.log2(Math.max(_.width,_.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?_.mipmaps.length:1}function I(A){let _=A.target;_.removeEventListener("dispose",I),R(_),_.isVideoTexture&&u.delete(_),_.isHTMLTexture&&d.delete(_)}function v(A){let _=A.target;_.removeEventListener("dispose",v),O(_)}function R(A){let _=i.get(A);if(_.__webglInit===void 0)return;let B=A.source,W=p.get(B);if(W){let J=W[_.__cacheKey];J.usedTimes--,J.usedTimes===0&&D(A),Object.keys(W).length===0&&p.delete(B)}i.remove(A)}function D(A){let _=i.get(A);n.deleteTexture(_.__webglTexture);let B=A.source,W=p.get(B);delete W[_.__cacheKey],a.memory.textures--}function O(A){let _=i.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),i.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let W=0;W<6;W++){if(Array.isArray(_.__webglFramebuffer[W]))for(let J=0;J<_.__webglFramebuffer[W].length;J++)n.deleteFramebuffer(_.__webglFramebuffer[W][J]);else n.deleteFramebuffer(_.__webglFramebuffer[W]);_.__webglDepthbuffer&&n.deleteRenderbuffer(_.__webglDepthbuffer[W])}else{if(Array.isArray(_.__webglFramebuffer))for(let W=0;W<_.__webglFramebuffer.length;W++)n.deleteFramebuffer(_.__webglFramebuffer[W]);else n.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&n.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&n.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let W=0;W<_.__webglColorRenderbuffer.length;W++)_.__webglColorRenderbuffer[W]&&n.deleteRenderbuffer(_.__webglColorRenderbuffer[W]);_.__webglDepthRenderbuffer&&n.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let B=A.textures;for(let W=0,J=B.length;W<J;W++){let le=i.get(B[W]);le.__webglTexture&&(n.deleteTexture(le.__webglTexture),a.memory.textures--),i.remove(B[W])}i.remove(A)}let P=0;function X(){P=0}function b(){return P}function T(A){P=A}function k(){let A=P;return A>=s.maxTextures&&Ue("WebGLTextures: Trying to use "+(A+1)+" texture units while this GPU supports only "+s.maxTextures),P+=1,A}function V(A){let _=[];return _.push(A.wrapS),_.push(A.wrapT),_.push(A.wrapR||0),_.push(A.magFilter),_.push(A.minFilter),_.push(A.anisotropy),_.push(A.internalFormat),_.push(A.format),_.push(A.type),_.push(A.generateMipmaps),_.push(A.premultiplyAlpha),_.push(A.flipY),_.push(A.unpackAlignment),_.push(A.colorSpace),_.join()}function re(A,_){let B=i.get(A);if(A.isVideoTexture&&N(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&B.__version!==A.version){let W=A.image;if(W===null)Ue("WebGLRenderer: Texture marked for update but no image data found.");else if(W.complete===!1)Ue("WebGLRenderer: Texture marked for update but image is incomplete");else{be(B,A,_);return}}else A.isExternalTexture&&(B.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,B.__webglTexture,n.TEXTURE0+_)}function Z(A,_){let B=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&B.__version!==A.version){be(B,A,_);return}else A.isExternalTexture&&(B.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(n.TEXTURE_2D_ARRAY,B.__webglTexture,n.TEXTURE0+_)}function ne(A,_){let B=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&B.__version!==A.version){be(B,A,_);return}t.bindTexture(n.TEXTURE_3D,B.__webglTexture,n.TEXTURE0+_)}function se(A,_){let B=i.get(A);if(A.isCubeDepthTexture!==!0&&A.version>0&&B.__version!==A.version){ze(B,A,_);return}t.bindTexture(n.TEXTURE_CUBE_MAP,B.__webglTexture,n.TEXTURE0+_)}let De={[Aa]:n.REPEAT,[kn]:n.CLAMP_TO_EDGE,[Ra]:n.MIRRORED_REPEAT},Re={[Ot]:n.NEAREST,[ed]:n.NEAREST_MIPMAP_NEAREST,[yr]:n.NEAREST_MIPMAP_LINEAR,[Bt]:n.LINEAR,[no]:n.LINEAR_MIPMAP_NEAREST,[Ti]:n.LINEAR_MIPMAP_LINEAR},mt={[sd]:n.NEVER,[cd]:n.ALWAYS,[rd]:n.LESS,[Vo]:n.LEQUAL,[ad]:n.EQUAL,[Ho]:n.GEQUAL,[od]:n.GREATER,[ld]:n.NOTEQUAL};function nt(A,_){if(_.type===Cn&&e.has("OES_texture_float_linear")===!1&&(_.magFilter===Bt||_.magFilter===no||_.magFilter===yr||_.magFilter===Ti||_.minFilter===Bt||_.minFilter===no||_.minFilter===yr||_.minFilter===Ti)&&Ue("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(A,n.TEXTURE_WRAP_S,De[_.wrapS]),n.texParameteri(A,n.TEXTURE_WRAP_T,De[_.wrapT]),(A===n.TEXTURE_3D||A===n.TEXTURE_2D_ARRAY)&&n.texParameteri(A,n.TEXTURE_WRAP_R,De[_.wrapR]),n.texParameteri(A,n.TEXTURE_MAG_FILTER,Re[_.magFilter]),n.texParameteri(A,n.TEXTURE_MIN_FILTER,Re[_.minFilter]),_.compareFunction&&(n.texParameteri(A,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(A,n.TEXTURE_COMPARE_FUNC,mt[_.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===Ot||_.minFilter!==yr&&_.minFilter!==Ti||_.type===Cn&&e.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||i.get(_).__currentAnisotropy){let B=e.get("EXT_texture_filter_anisotropic");n.texParameterf(A,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),i.get(_).__currentAnisotropy=_.anisotropy}}}function lt(A,_){let B=!1;A.__webglInit===void 0&&(A.__webglInit=!0,_.addEventListener("dispose",I));let W=_.source,J=p.get(W);J===void 0&&(J={},p.set(W,J));let le=V(_);if(le!==A.__cacheKey){J[le]===void 0&&(J[le]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,B=!0),J[le].usedTimes++;let ue=J[A.__cacheKey];ue!==void 0&&(J[A.__cacheKey].usedTimes--,ue.usedTimes===0&&D(_)),A.__cacheKey=le,A.__webglTexture=J[le].texture}return B}function K(A,_,B){return Math.floor(Math.floor(A/B)/_)}function te(A,_,B,W){let le=A.updateRanges;if(le.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,_.width,_.height,B,W,_.data);else{le.sort((Ie,me)=>Ie.start-me.start);let ue=0;for(let Ie=1;Ie<le.length;Ie++){let me=le[ue],de=le[Ie],Pe=me.start+me.count,Fe=K(de.start,_.width,4),We=K(me.start,_.width,4);de.start<=Pe+1&&Fe===We&&K(de.start+de.count-1,_.width,4)===Fe?me.count=Math.max(me.count,de.start+de.count-me.start):(++ue,le[ue]=de)}le.length=ue+1;let j=t.getParameter(n.UNPACK_ROW_LENGTH),ee=t.getParameter(n.UNPACK_SKIP_PIXELS),he=t.getParameter(n.UNPACK_SKIP_ROWS);t.pixelStorei(n.UNPACK_ROW_LENGTH,_.width);for(let Ie=0,me=le.length;Ie<me;Ie++){let de=le[Ie],Pe=Math.floor(de.start/4),Fe=Math.ceil(de.count/4),We=Pe%_.width,F=Math.floor(Pe/_.width),fe=Fe,Q=1;t.pixelStorei(n.UNPACK_SKIP_PIXELS,We),t.pixelStorei(n.UNPACK_SKIP_ROWS,F),t.texSubImage2D(n.TEXTURE_2D,0,We,F,fe,Q,B,W,_.data)}A.clearUpdateRanges(),t.pixelStorei(n.UNPACK_ROW_LENGTH,j),t.pixelStorei(n.UNPACK_SKIP_PIXELS,ee),t.pixelStorei(n.UNPACK_SKIP_ROWS,he)}}function be(A,_,B){let W=n.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(W=n.TEXTURE_2D_ARRAY),_.isData3DTexture&&(W=n.TEXTURE_3D);let J=lt(A,_),le=_.source;t.bindTexture(W,A.__webglTexture,n.TEXTURE0+B);let ue=i.get(le);if(le.version!==ue.__version||J===!0){if(t.activeTexture(n.TEXTURE0+B),(typeof ImageBitmap<"u"&&_.image instanceof ImageBitmap)===!1){let Q=ot.getPrimaries(ot.workingColorSpace),pe=_.colorSpace===ti?null:ot.getPrimaries(_.colorSpace),xe=_.colorSpace===ti||Q===pe?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,_.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,xe)}t.pixelStorei(n.UNPACK_ALIGNMENT,_.unpackAlignment);let ee=g(_.image,!1,s.maxTextureSize);ee=ft(_,ee);let he=r.convert(_.format,_.colorSpace),Ie=r.convert(_.type),me=S(_.internalFormat,he,Ie,_.normalized,_.colorSpace,_.isVideoTexture);nt(W,_);let de,Pe=_.mipmaps,Fe=_.isVideoTexture!==!0,We=ue.__version===void 0||J===!0,F=le.dataReady,fe=w(_,ee);if(_.isDepthTexture)me=E(_.format===wi,_.type),We&&(Fe?t.texStorage2D(n.TEXTURE_2D,1,me,ee.width,ee.height):t.texImage2D(n.TEXTURE_2D,0,me,ee.width,ee.height,0,he,Ie,null));else if(_.isDataTexture)if(Pe.length>0){Fe&&We&&t.texStorage2D(n.TEXTURE_2D,fe,me,Pe[0].width,Pe[0].height);for(let Q=0,pe=Pe.length;Q<pe;Q++)de=Pe[Q],Fe?F&&t.texSubImage2D(n.TEXTURE_2D,Q,0,0,de.width,de.height,he,Ie,de.data):t.texImage2D(n.TEXTURE_2D,Q,me,de.width,de.height,0,he,Ie,de.data);_.generateMipmaps=!1}else Fe?(We&&t.texStorage2D(n.TEXTURE_2D,fe,me,ee.width,ee.height),F&&te(_,ee,he,Ie)):t.texImage2D(n.TEXTURE_2D,0,me,ee.width,ee.height,0,he,Ie,ee.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){Fe&&We&&t.texStorage3D(n.TEXTURE_2D_ARRAY,fe,me,Pe[0].width,Pe[0].height,ee.depth);for(let Q=0,pe=Pe.length;Q<pe;Q++)if(de=Pe[Q],_.format!==yn)if(he!==null)if(Fe){if(F)if(_.layerUpdates.size>0){let xe=zc(de.width,de.height,_.format,_.type);for(let ae of _.layerUpdates){let Ne=de.data.subarray(ae*xe/de.data.BYTES_PER_ELEMENT,(ae+1)*xe/de.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Q,0,0,ae,de.width,de.height,1,he,Ne)}}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Q,0,0,0,de.width,de.height,ee.depth,he,de.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,Q,me,de.width,de.height,ee.depth,0,de.data,0,0);else Ue("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Fe?F&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,Q,0,0,0,de.width,de.height,ee.depth,he,Ie,de.data):t.texImage3D(n.TEXTURE_2D_ARRAY,Q,me,de.width,de.height,ee.depth,0,he,Ie,de.data);_.layerUpdates.size>0&&_.clearLayerUpdates()}else{Fe&&We&&t.texStorage2D(n.TEXTURE_2D,fe,me,Pe[0].width,Pe[0].height);for(let Q=0,pe=Pe.length;Q<pe;Q++)de=Pe[Q],_.format!==yn?he!==null?Fe?F&&t.compressedTexSubImage2D(n.TEXTURE_2D,Q,0,0,de.width,de.height,he,de.data):t.compressedTexImage2D(n.TEXTURE_2D,Q,me,de.width,de.height,0,de.data):Ue("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Fe?F&&t.texSubImage2D(n.TEXTURE_2D,Q,0,0,de.width,de.height,he,Ie,de.data):t.texImage2D(n.TEXTURE_2D,Q,me,de.width,de.height,0,he,Ie,de.data)}else if(_.isDataArrayTexture)if(Fe){if(We&&t.texStorage3D(n.TEXTURE_2D_ARRAY,fe,me,ee.width,ee.height,ee.depth),F)if(_.layerUpdates.size>0){let Q=zc(ee.width,ee.height,_.format,_.type);for(let pe of _.layerUpdates){let xe=ee.data.subarray(pe*Q/ee.data.BYTES_PER_ELEMENT,(pe+1)*Q/ee.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,pe,ee.width,ee.height,1,he,Ie,xe)}_.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,ee.width,ee.height,ee.depth,he,Ie,ee.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,me,ee.width,ee.height,ee.depth,0,he,Ie,ee.data);else if(_.isData3DTexture)Fe?(We&&t.texStorage3D(n.TEXTURE_3D,fe,me,ee.width,ee.height,ee.depth),F&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,ee.width,ee.height,ee.depth,he,Ie,ee.data)):t.texImage3D(n.TEXTURE_3D,0,me,ee.width,ee.height,ee.depth,0,he,Ie,ee.data);else if(_.isFramebufferTexture){if(We)if(Fe)t.texStorage2D(n.TEXTURE_2D,fe,me,ee.width,ee.height);else{let Q=ee.width,pe=ee.height;for(let xe=0;xe<fe;xe++)t.texImage2D(n.TEXTURE_2D,xe,me,Q,pe,0,he,Ie,null),Q>>=1,pe>>=1}}else if(_.isHTMLTexture){if("texElementImage2D"in n){let Q=n.canvas;if(Q.hasAttribute("layoutsubtree")||Q.setAttribute("layoutsubtree","true"),ee.parentNode!==Q){Q.appendChild(ee),d.add(_),Q.onpaint=pe=>{let xe=pe.changedElements;for(let ae of d)xe.includes(ae.image)&&(ae.needsUpdate=!0)},Q.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,ee);else{let xe=n.RGBA,ae=n.RGBA,Ne=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,xe,ae,Ne,ee)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(Pe.length>0){if(Fe&&We){let Q=qe(Pe[0]);t.texStorage2D(n.TEXTURE_2D,fe,me,Q.width,Q.height)}for(let Q=0,pe=Pe.length;Q<pe;Q++)de=Pe[Q],Fe?F&&t.texSubImage2D(n.TEXTURE_2D,Q,0,0,he,Ie,de):t.texImage2D(n.TEXTURE_2D,Q,me,he,Ie,de);_.generateMipmaps=!1}else if(Fe){if(We){let Q=qe(ee);t.texStorage2D(n.TEXTURE_2D,fe,me,Q.width,Q.height)}F&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,he,Ie,ee)}else t.texImage2D(n.TEXTURE_2D,0,me,he,Ie,ee);f(_)&&M(W),ue.__version=le.version,_.onUpdate&&_.onUpdate(_)}A.__version=_.version}function ze(A,_,B){if(_.image.length!==6)return;let W=lt(A,_),J=_.source;t.bindTexture(n.TEXTURE_CUBE_MAP,A.__webglTexture,n.TEXTURE0+B);let le=i.get(J);if(J.version!==le.__version||W===!0){t.activeTexture(n.TEXTURE0+B);let ue=ot.getPrimaries(ot.workingColorSpace),j=_.colorSpace===ti?null:ot.getPrimaries(_.colorSpace),ee=_.colorSpace===ti||ue===j?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,_.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),t.pixelStorei(n.UNPACK_ALIGNMENT,_.unpackAlignment),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,ee);let he=_.isCompressedTexture||_.image[0].isCompressedTexture,Ie=_.image[0]&&_.image[0].isDataTexture,me=[];for(let ae=0;ae<6;ae++)!he&&!Ie?me[ae]=g(_.image[ae],!0,s.maxCubemapSize):me[ae]=Ie?_.image[ae].image:_.image[ae],me[ae]=ft(_,me[ae]);let de=me[0],Pe=r.convert(_.format,_.colorSpace),Fe=r.convert(_.type),We=S(_.internalFormat,Pe,Fe,_.normalized,_.colorSpace),F=_.isVideoTexture!==!0,fe=le.__version===void 0||W===!0,Q=J.dataReady,pe=w(_,de);nt(n.TEXTURE_CUBE_MAP,_);let xe;if(he){F&&fe&&t.texStorage2D(n.TEXTURE_CUBE_MAP,pe,We,de.width,de.height);for(let ae=0;ae<6;ae++){xe=me[ae].mipmaps;for(let Ne=0;Ne<xe.length;Ne++){let Te=xe[Ne];_.format!==yn?Pe!==null?F?Q&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ne,0,0,Te.width,Te.height,Pe,Te.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ne,We,Te.width,Te.height,0,Te.data):Ue("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):F?Q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ne,0,0,Te.width,Te.height,Pe,Fe,Te.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ne,We,Te.width,Te.height,0,Pe,Fe,Te.data)}}}else{if(xe=_.mipmaps,F&&fe){xe.length>0&&pe++;let ae=qe(me[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,pe,We,ae.width,ae.height)}for(let ae=0;ae<6;ae++)if(Ie){F?Q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,0,0,me[ae].width,me[ae].height,Pe,Fe,me[ae].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,We,me[ae].width,me[ae].height,0,Pe,Fe,me[ae].data);for(let Ne=0;Ne<xe.length;Ne++){let xt=xe[Ne].image[ae].image;F?Q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ne+1,0,0,xt.width,xt.height,Pe,Fe,xt.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ne+1,We,xt.width,xt.height,0,Pe,Fe,xt.data)}}else{F?Q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,0,0,Pe,Fe,me[ae]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,We,Pe,Fe,me[ae]);for(let Ne=0;Ne<xe.length;Ne++){let Te=xe[Ne];F?Q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ne+1,0,0,Pe,Fe,Te.image[ae]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ne+1,We,Pe,Fe,Te.image[ae])}}}f(_)&&M(n.TEXTURE_CUBE_MAP),le.__version=J.version,_.onUpdate&&_.onUpdate(_)}A.__version=_.version}function ce(A,_,B,W,J,le){let ue=r.convert(B.format,B.colorSpace),j=r.convert(B.type),ee=S(B.internalFormat,ue,j,B.normalized,B.colorSpace),he=i.get(_),Ie=i.get(B);if(Ie.__renderTarget=_,!he.__hasExternalTextures){let me=Math.max(1,_.width>>le),de=Math.max(1,_.height>>le);J===n.TEXTURE_3D||J===n.TEXTURE_2D_ARRAY?t.texImage3D(J,le,ee,me,de,_.depth,0,ue,j,null):t.texImage2D(J,le,ee,me,de,0,ue,j,null)}t.bindFramebuffer(n.FRAMEBUFFER,A),at(_)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,W,J,Ie.__webglTexture,0,Ge(_)):(J===n.TEXTURE_2D||J>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,W,J,Ie.__webglTexture,le),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ye(A,_,B){if(n.bindRenderbuffer(n.RENDERBUFFER,A),_.depthBuffer){let W=_.depthTexture,J=W&&W.isDepthTexture?W.type:null,le=E(_.stencilBuffer,J),ue=_.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;at(_)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Ge(_),le,_.width,_.height):B?n.renderbufferStorageMultisample(n.RENDERBUFFER,Ge(_),le,_.width,_.height):n.renderbufferStorage(n.RENDERBUFFER,le,_.width,_.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,ue,n.RENDERBUFFER,A)}else{let W=_.textures;for(let J=0;J<W.length;J++){let le=W[J],ue=r.convert(le.format,le.colorSpace),j=r.convert(le.type),ee=S(le.internalFormat,ue,j,le.normalized,le.colorSpace);at(_)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Ge(_),ee,_.width,_.height):B?n.renderbufferStorageMultisample(n.RENDERBUFFER,Ge(_),ee,_.width,_.height):n.renderbufferStorage(n.RENDERBUFFER,ee,_.width,_.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Mt(A,_,B){let W=_.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(n.FRAMEBUFFER,A),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let J=i.get(_.depthTexture);if(J.__renderTarget=_,(!J.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),W){if(J.__webglInit===void 0&&(J.__webglInit=!0,_.depthTexture.addEventListener("dispose",I)),J.__webglTexture===void 0){J.__webglTexture=n.createTexture(),t.bindTexture(n.TEXTURE_CUBE_MAP,J.__webglTexture),nt(n.TEXTURE_CUBE_MAP,_.depthTexture);let he=r.convert(_.depthTexture.format),Ie=r.convert(_.depthTexture.type),me;_.depthTexture.format===Bn?me=n.DEPTH_COMPONENT24:_.depthTexture.format===wi&&(me=n.DEPTH24_STENCIL8);for(let de=0;de<6;de++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,me,_.width,_.height,0,he,Ie,null)}}else re(_.depthTexture,0);let le=J.__webglTexture,ue=Ge(_),j=W?n.TEXTURE_CUBE_MAP_POSITIVE_X+B:n.TEXTURE_2D,ee=_.depthTexture.format===wi?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(_.depthTexture.format===Bn)at(_)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ee,j,le,0,ue):n.framebufferTexture2D(n.FRAMEBUFFER,ee,j,le,0);else if(_.depthTexture.format===wi)at(_)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ee,j,le,0,ue):n.framebufferTexture2D(n.FRAMEBUFFER,ee,j,le,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Ze(A){let _=i.get(A),B=A.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==A.depthTexture){let W=A.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),W){let J=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,W.removeEventListener("dispose",J)};W.addEventListener("dispose",J),_.__depthDisposeCallback=J}_.__boundDepthTexture=W}if(A.depthTexture&&!_.__autoAllocateDepthBuffer)if(B)for(let W=0;W<6;W++)Mt(_.__webglFramebuffer[W],A,W);else{let W=A.texture.mipmaps;W&&W.length>0?Mt(_.__webglFramebuffer[0],A,0):Mt(_.__webglFramebuffer,A,0)}else if(B){_.__webglDepthbuffer=[];for(let W=0;W<6;W++)if(t.bindFramebuffer(n.FRAMEBUFFER,_.__webglFramebuffer[W]),_.__webglDepthbuffer[W]===void 0)_.__webglDepthbuffer[W]=n.createRenderbuffer(),Ye(_.__webglDepthbuffer[W],A,!1);else{let J=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,le=_.__webglDepthbuffer[W];n.bindRenderbuffer(n.RENDERBUFFER,le),n.framebufferRenderbuffer(n.FRAMEBUFFER,J,n.RENDERBUFFER,le)}}else{let W=A.texture.mipmaps;if(W&&W.length>0?t.bindFramebuffer(n.FRAMEBUFFER,_.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=n.createRenderbuffer(),Ye(_.__webglDepthbuffer,A,!1);else{let J=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,le=_.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,le),n.framebufferRenderbuffer(n.FRAMEBUFFER,J,n.RENDERBUFFER,le)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function it(A,_,B){let W=i.get(A);_!==void 0&&ce(W.__webglFramebuffer,A,A.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),B!==void 0&&Ze(A)}function gt(A){let _=A.texture,B=i.get(A),W=i.get(_);A.addEventListener("dispose",v);let J=A.textures,le=A.isWebGLCubeRenderTarget===!0,ue=J.length>1;if(ue||(W.__webglTexture===void 0&&(W.__webglTexture=n.createTexture()),W.__version=_.version,a.memory.textures++),le){B.__webglFramebuffer=[];for(let j=0;j<6;j++)if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer[j]=[];for(let ee=0;ee<_.mipmaps.length;ee++)B.__webglFramebuffer[j][ee]=n.createFramebuffer()}else B.__webglFramebuffer[j]=n.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer=[];for(let j=0;j<_.mipmaps.length;j++)B.__webglFramebuffer[j]=n.createFramebuffer()}else B.__webglFramebuffer=n.createFramebuffer();if(ue)for(let j=0,ee=J.length;j<ee;j++){let he=i.get(J[j]);he.__webglTexture===void 0&&(he.__webglTexture=n.createTexture(),a.memory.textures++)}if(A.samples>0&&at(A)===!1){B.__webglMultisampledFramebuffer=n.createFramebuffer(),B.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let j=0;j<J.length;j++){let ee=J[j];B.__webglColorRenderbuffer[j]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,B.__webglColorRenderbuffer[j]);let he=r.convert(ee.format,ee.colorSpace),Ie=r.convert(ee.type),me=S(ee.internalFormat,he,Ie,ee.normalized,ee.colorSpace,A.isXRRenderTarget===!0),de=Ge(A);n.renderbufferStorageMultisample(n.RENDERBUFFER,de,me,A.width,A.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+j,n.RENDERBUFFER,B.__webglColorRenderbuffer[j])}n.bindRenderbuffer(n.RENDERBUFFER,null),A.depthBuffer&&(B.__webglDepthRenderbuffer=n.createRenderbuffer(),Ye(B.__webglDepthRenderbuffer,A,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(le){t.bindTexture(n.TEXTURE_CUBE_MAP,W.__webglTexture),nt(n.TEXTURE_CUBE_MAP,_);for(let j=0;j<6;j++)if(_.mipmaps&&_.mipmaps.length>0)for(let ee=0;ee<_.mipmaps.length;ee++)ce(B.__webglFramebuffer[j][ee],A,_,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+j,ee);else ce(B.__webglFramebuffer[j],A,_,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+j,0);f(_)&&M(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ue){for(let j=0,ee=J.length;j<ee;j++){let he=J[j],Ie=i.get(he),me=n.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(me=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(me,Ie.__webglTexture),nt(me,he),ce(B.__webglFramebuffer,A,he,n.COLOR_ATTACHMENT0+j,me,0),f(he)&&M(me)}t.unbindTexture()}else{let j=n.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(j=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(j,W.__webglTexture),nt(j,_),_.mipmaps&&_.mipmaps.length>0)for(let ee=0;ee<_.mipmaps.length;ee++)ce(B.__webglFramebuffer[ee],A,_,n.COLOR_ATTACHMENT0,j,ee);else ce(B.__webglFramebuffer,A,_,n.COLOR_ATTACHMENT0,j,0);f(_)&&M(j),t.unbindTexture()}A.depthBuffer&&Ze(A)}function Qe(A){let _=A.textures;for(let B=0,W=_.length;B<W;B++){let J=_[B];if(f(J)){let le=C(A),ue=i.get(J).__webglTexture;t.bindTexture(le,ue),M(le),t.unbindTexture()}}}let oe=[],Ce=[];function Le(A){if(A.samples>0){if(at(A)===!1){let _=A.textures,B=A.width,W=A.height,J=n.COLOR_BUFFER_BIT,le=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ue=i.get(A),j=_.length>1;if(j)for(let he=0;he<_.length;he++)t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+he,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+he,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,ue.__webglMultisampledFramebuffer);let ee=A.texture.mipmaps;ee&&ee.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ue.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ue.__webglFramebuffer);for(let he=0;he<_.length;he++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(J|=n.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(J|=n.STENCIL_BUFFER_BIT)),j){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ue.__webglColorRenderbuffer[he]);let Ie=i.get(_[he]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Ie,0)}n.blitFramebuffer(0,0,B,W,0,0,B,W,J,n.NEAREST),l===!0&&(oe.length=0,Ce.length=0,oe.push(n.COLOR_ATTACHMENT0+he),A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&(oe.push(le),Ce.push(le),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,Ce)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,oe))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),j)for(let he=0;he<_.length;he++){t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+he,n.RENDERBUFFER,ue.__webglColorRenderbuffer[he]);let Ie=i.get(_[he]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+he,n.TEXTURE_2D,Ie,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ue.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&l){let _=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[_])}}}function Ge(A){return Math.min(s.maxSamples,A.samples)}function at(A){let _=i.get(A);return A.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function N(A){let _=a.render.frame;u.get(A)!==_&&(u.set(A,_),A.update())}function ft(A,_){let B=A.colorSpace,W=A.format,J=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||B!==js&&B!==ti&&(ot.getTransfer(B)===dt?(W!==yn||J!==sn)&&Ue("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):ke("WebGLTextures: Unsupported texture color space:",B)),_}function qe(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=k,this.resetTextureUnits=X,this.getTextureUnits=b,this.setTextureUnits=T,this.setTexture2D=re,this.setTexture2DArray=Z,this.setTexture3D=ne,this.setTextureCube=se,this.rebindTextures=it,this.setupRenderTarget=gt,this.updateRenderTargetMipmap=Qe,this.updateMultisampleRenderTarget=Le,this.setupDepthRenderbuffer=Ze,this.setupFrameBufferTexture=ce,this.useMultisampledRTT=at,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function Iv(n,e){function t(i,s=ti){let r,a=ot.getTransfer(s);if(i===sn)return n.UNSIGNED_BYTE;if(i===so)return n.UNSIGNED_SHORT_4_4_4_4;if(i===ro)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Cc)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Ic)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===Ac)return n.BYTE;if(i===Rc)return n.SHORT;if(i===Is)return n.UNSIGNED_SHORT;if(i===io)return n.INT;if(i===Rn)return n.UNSIGNED_INT;if(i===Cn)return n.FLOAT;if(i===In)return n.HALF_FLOAT;if(i===Pc)return n.ALPHA;if(i===Nc)return n.RGB;if(i===yn)return n.RGBA;if(i===Bn)return n.DEPTH_COMPONENT;if(i===wi)return n.DEPTH_STENCIL;if(i===Dc)return n.RED;if(i===ao)return n.RED_INTEGER;if(i===Ai)return n.RG;if(i===oo)return n.RG_INTEGER;if(i===lo)return n.RGBA_INTEGER;if(i===br||i===Sr||i===Mr||i===Er)if(a===dt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===br)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Sr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Mr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Er)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===br)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Sr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Mr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Er)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===co||i===uo||i===ho||i===fo)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===co)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===uo)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===ho)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===fo)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===po||i===mo||i===go||i===_o||i===vo||i===Tr||i===xo)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(i===po||i===mo)return a===dt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===go)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===_o)return r.COMPRESSED_R11_EAC;if(i===vo)return r.COMPRESSED_SIGNED_R11_EAC;if(i===Tr)return r.COMPRESSED_RG11_EAC;if(i===xo)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===yo||i===bo||i===So||i===Mo||i===Eo||i===To||i===wo||i===Ao||i===Ro||i===Co||i===Io||i===Po||i===No||i===Do)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(i===yo)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===bo)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===So)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Mo)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Eo)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===To)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===wo)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Ao)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Ro)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Co)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Io)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Po)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===No)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Do)return a===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Lo||i===Uo||i===Fo)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(i===Lo)return a===dt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Uo)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Fo)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Oo||i===ko||i===wr||i===Bo)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(i===Oo)return r.COMPRESSED_RED_RGTC1_EXT;if(i===ko)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===wr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Bo)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Ps?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}var Pv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Nv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,eu=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let i=new cr(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,i=new pn({vertexShader:Pv,fragmentShader:Nv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Vt(new dr(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},tu=class extends wn{constructor(e,t){super();let i=this,s=null,r=1,a=null,o="local-floor",l=1,c=null,u=null,d=null,h=null,p=null,m=null,y=typeof XRWebGLBinding<"u",g=new eu,f={},M=t.getContextAttributes(),C=null,S=null,E=[],w=[],I=new Be,v=null,R=null,D=new qt;D.viewport=new Tt;let O=new qt;O.viewport=new Tt;let P=[D,O],X=new Qa,b=null,T=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let te=E[K];return te===void 0&&(te=new bs,E[K]=te),te.getTargetRaySpace()},this.getControllerGrip=function(K){let te=E[K];return te===void 0&&(te=new bs,E[K]=te),te.getGripSpace()},this.getHand=function(K){let te=E[K];return te===void 0&&(te=new bs,E[K]=te),te.getHandSpace()};function k(K){let te=w.indexOf(K.inputSource);if(te===-1)return;let be=E[te];be!==void 0&&(be.update(K.inputSource,K.frame,c||a),be.dispatchEvent({type:K.type,data:K.inputSource}))}function V(){s.removeEventListener("select",k),s.removeEventListener("selectstart",k),s.removeEventListener("selectend",k),s.removeEventListener("squeeze",k),s.removeEventListener("squeezestart",k),s.removeEventListener("squeezeend",k),s.removeEventListener("end",V),s.removeEventListener("inputsourceschange",re);for(let K=0;K<E.length;K++){let te=w[K];te!==null&&(w[K]=null,E[K].disconnect(te))}b=null,T=null,g.reset();for(let K in f)delete f[K];if(e.setRenderTarget(C),p=null,h=null,d=null,s=null,S=null,lt.stop(),i.isPresenting=!1,e.setPixelRatio(v),e.setSize(I.width,I.height,!1),R!==null){let K=R.camera;K.fov=R.fov,K.zoom=R.zoom,K.updateProjectionMatrix(),R=null}i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){r=K,i.isPresenting===!0&&Ue("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){o=K,i.isPresenting===!0&&Ue("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(K){c=K},this.getBaseLayer=function(){return h!==null?h:p},this.getBinding=function(){return d===null&&y&&(d=new XRWebGLBinding(s,t)),d},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function(K){if(s=K,s!==null){if(C=e.getRenderTarget(),s.addEventListener("select",k),s.addEventListener("selectstart",k),s.addEventListener("selectend",k),s.addEventListener("squeeze",k),s.addEventListener("squeezestart",k),s.addEventListener("squeezeend",k),s.addEventListener("end",V),s.addEventListener("inputsourceschange",re),M.xrCompatible!==!0&&await t.makeXRCompatible(),v=e.getPixelRatio(),e.getSize(I),y&&"createProjectionLayer"in XRWebGLBinding.prototype){let be=null,ze=null,ce=null;M.depth&&(ce=M.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,be=M.stencil?wi:Bn,ze=M.stencil?Ps:Rn);let Ye={colorFormat:t.RGBA8,depthFormat:ce,scaleFactor:r};d=this.getBinding(),h=d.createProjectionLayer(Ye),s.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),S=new nn(h.textureWidth,h.textureHeight,{format:yn,type:sn,depthTexture:new mi(h.textureWidth,h.textureHeight,ze,void 0,void 0,void 0,void 0,void 0,void 0,be),stencilBuffer:M.stencil,colorSpace:e.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1,storeMultisampledDepthBuffer:h.ignoreDepthValues===!1,storeMultisampledStencilBuffer:h.ignoreDepthValues===!1})}else{let be={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,t,be),s.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),S=new nn(p.framebufferWidth,p.framebufferHeight,{format:yn,type:sn,colorSpace:e.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),lt.setContext(s),lt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function re(K){for(let te=0;te<K.removed.length;te++){let be=K.removed[te],ze=w.indexOf(be);ze>=0&&(w[ze]=null,E[ze].disconnect(be))}for(let te=0;te<K.added.length;te++){let be=K.added[te],ze=w.indexOf(be);if(ze===-1){for(let Ye=0;Ye<E.length;Ye++)if(Ye>=w.length){w.push(be),ze=Ye;break}else if(w[Ye]===null){w[Ye]=be,ze=Ye;break}if(ze===-1)break}let ce=E[ze];ce&&ce.connect(be)}}let Z=new U,ne=new U;function se(K,te,be){Z.setFromMatrixPosition(te.matrixWorld),ne.setFromMatrixPosition(be.matrixWorld);let ze=Z.distanceTo(ne),ce=te.projectionMatrix.elements,Ye=be.projectionMatrix.elements,Mt=ce[14]/(ce[10]-1),Ze=ce[14]/(ce[10]+1),it=(ce[9]+1)/ce[5],gt=(ce[9]-1)/ce[5],Qe=(ce[8]-1)/ce[0],oe=(Ye[8]+1)/Ye[0],Ce=Mt*Qe,Le=Mt*oe,Ge=ze/(-Qe+oe),at=Ge*-Qe;if(te.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(at),K.translateZ(Ge),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),ce[10]===-1)K.projectionMatrix.copy(te.projectionMatrix),K.projectionMatrixInverse.copy(te.projectionMatrixInverse);else{let N=Mt+Ge,ft=Ze+Ge,qe=Ce-at,A=Le+(ze-at),_=it*Ze/ft*N,B=gt*Ze/ft*N;K.projectionMatrix.makePerspective(qe,A,_,B,N,ft),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function De(K,te){te===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(te.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(s===null)return;let te=K.near,be=K.far;g.texture!==null&&(g.depthNear>0&&(te=g.depthNear),g.depthFar>0&&(be=g.depthFar)),X.near=O.near=D.near=te,X.far=O.far=D.far=be,(b!==X.near||T!==X.far)&&(s.updateRenderState({depthNear:X.near,depthFar:X.far}),b=X.near,T=X.far),X.layers.mask=K.layers.mask|6,D.layers.mask=X.layers.mask&-5,O.layers.mask=X.layers.mask&-3;let ze=K.parent,ce=X.cameras;De(X,ze);for(let Ye=0;Ye<ce.length;Ye++)De(ce[Ye],ze);ce.length===2?se(X,D,O):X.projectionMatrix.copy(D.projectionMatrix),R===null&&K.isPerspectiveCamera&&(R={camera:K,fov:K.fov,zoom:K.zoom}),Re(K,X,ze)};function Re(K,te,be){be===null?K.matrix.copy(te.matrixWorld):(K.matrix.copy(be.matrixWorld),K.matrix.invert(),K.matrix.multiply(te.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(te.projectionMatrix),K.projectionMatrixInverse.copy(te.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=xs*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return X},this.getFoveation=function(){if(!(h===null&&p===null))return l},this.setFoveation=function(K){l=K,h!==null&&(h.fixedFoveation=K),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=K)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(X)},this.getCameraTexture=function(K){return f[K]};let mt=null;function nt(K,te){if(u=te.getViewerPose(c||a),m=te,u!==null){let be=u.views;p!==null&&(e.setRenderTargetFramebuffer(S,p.framebuffer),e.setRenderTarget(S));let ze=!1;be.length!==X.cameras.length&&(X.cameras.length=0,ze=!0);for(let Ze=0;Ze<be.length;Ze++){let it=be[Ze],gt=null;if(p!==null)gt=p.getViewport(it);else{let oe=d.getViewSubImage(h,it);gt=oe.viewport,Ze===0&&(e.setRenderTargetTextures(S,oe.colorTexture,oe.depthStencilTexture),e.setRenderTarget(S))}let Qe=P[Ze];Qe===void 0&&(Qe=new qt,Qe.layers.enable(Ze),Qe.viewport=new Tt,P[Ze]=Qe),Qe.matrix.fromArray(it.transform.matrix),Qe.matrix.decompose(Qe.position,Qe.quaternion,Qe.scale),Qe.projectionMatrix.fromArray(it.projectionMatrix),Qe.projectionMatrixInverse.copy(Qe.projectionMatrix).invert(),Qe.viewport.set(gt.x,gt.y,gt.width,gt.height),Ze===0&&(X.matrix.copy(Qe.matrix),X.matrix.decompose(X.position,X.quaternion,X.scale)),ze===!0&&X.cameras.push(Qe)}let ce=s.enabledFeatures;if(ce&&ce.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&y){d=i.getBinding();let Ze=d.getDepthInformation(be[0]);Ze&&Ze.isValid&&Ze.texture&&g.init(Ze,s.renderState)}if(ce&&ce.includes("camera-access")&&y){e.state.unbindTexture(),d=i.getBinding();for(let Ze=0;Ze<be.length;Ze++){let it=be[Ze].camera;if(it){let gt=f[it];gt||(gt=new cr,f[it]=gt);let Qe=d.getCameraImage(it);gt.sourceTexture=Qe}}}}for(let be=0;be<E.length;be++){let ze=w[be],ce=E[be];ze!==null&&ce!==void 0&&ce.update(ze,te,c||a)}mt&&mt(K,te),te.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:te}),m=null}let lt=new zd;lt.setAnimationLoop(nt),this.setAnimationLoop=function(K){mt=K},this.dispose=function(){}}},Dv=new Et,qd=new Ve;qd.set(-1,0,0,0,1,0,0,0,1);function Lv(n,e){function t(g,f){g.matrixAutoUpdate===!0&&g.updateMatrix(),f.value.copy(g.matrix)}function i(g,f){f.color.getRGB(g.fogColor.value,Oc(n)),f.isFog?(g.fogNear.value=f.near,g.fogFar.value=f.far):f.isFogExp2&&(g.fogDensity.value=f.density)}function s(g,f,M,C,S){f.isNodeMaterial?f.uniformsNeedUpdate=!1:f.isMeshBasicMaterial?r(g,f):f.isMeshLambertMaterial?(r(g,f),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)):f.isMeshToonMaterial?(r(g,f),d(g,f)):f.isMeshPhongMaterial?(r(g,f),u(g,f),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)):f.isMeshStandardMaterial?(r(g,f),h(g,f),f.isMeshPhysicalMaterial&&p(g,f,S)):f.isMeshMatcapMaterial?(r(g,f),m(g,f)):f.isMeshDepthMaterial?r(g,f):f.isMeshDistanceMaterial?(r(g,f),y(g,f)):f.isMeshNormalMaterial?r(g,f):f.isLineBasicMaterial?(a(g,f),f.isLineDashedMaterial&&o(g,f)):f.isPointsMaterial?l(g,f,M,C):f.isSpriteMaterial?c(g,f):f.isShadowMaterial?(g.color.value.copy(f.color),g.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(g,f){g.opacity.value=f.opacity,f.color&&g.diffuse.value.copy(f.color),f.emissive&&g.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(g.map.value=f.map,t(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,t(f.alphaMap,g.alphaMapTransform)),f.bumpMap&&(g.bumpMap.value=f.bumpMap,t(f.bumpMap,g.bumpMapTransform),g.bumpScale.value=f.bumpScale,f.side===Jt&&(g.bumpScale.value*=-1)),f.normalMap&&(g.normalMap.value=f.normalMap,t(f.normalMap,g.normalMapTransform),g.normalScale.value.copy(f.normalScale),f.side===Jt&&g.normalScale.value.negate()),f.displacementMap&&(g.displacementMap.value=f.displacementMap,t(f.displacementMap,g.displacementMapTransform),g.displacementScale.value=f.displacementScale,g.displacementBias.value=f.displacementBias),f.emissiveMap&&(g.emissiveMap.value=f.emissiveMap,t(f.emissiveMap,g.emissiveMapTransform)),f.specularMap&&(g.specularMap.value=f.specularMap,t(f.specularMap,g.specularMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest);let M=e.get(f),C=M.envMap,S=M.envMapRotation;C&&(g.envMap.value=C,g.envMapRotation.value.setFromMatrix4(Dv.makeRotationFromEuler(S)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(qd),g.reflectivity.value=f.reflectivity,g.ior.value=f.ior,g.refractionRatio.value=f.refractionRatio),f.lightMap&&(g.lightMap.value=f.lightMap,g.lightMapIntensity.value=f.lightMapIntensity,t(f.lightMap,g.lightMapTransform)),f.aoMap&&(g.aoMap.value=f.aoMap,g.aoMapIntensity.value=f.aoMapIntensity,t(f.aoMap,g.aoMapTransform))}function a(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,f.map&&(g.map.value=f.map,t(f.map,g.mapTransform))}function o(g,f){g.dashSize.value=f.dashSize,g.totalSize.value=f.dashSize+f.gapSize,g.scale.value=f.scale}function l(g,f,M,C){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.size.value=f.size*M,g.scale.value=C*.5,f.map&&(g.map.value=f.map,t(f.map,g.uvTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,t(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function c(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.rotation.value=f.rotation,f.map&&(g.map.value=f.map,t(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,t(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function u(g,f){g.specular.value.copy(f.specular),g.shininess.value=Math.max(f.shininess,1e-4)}function d(g,f){f.gradientMap&&(g.gradientMap.value=f.gradientMap)}function h(g,f){g.metalness.value=f.metalness,f.metalnessMap&&(g.metalnessMap.value=f.metalnessMap,t(f.metalnessMap,g.metalnessMapTransform)),g.roughness.value=f.roughness,f.roughnessMap&&(g.roughnessMap.value=f.roughnessMap,t(f.roughnessMap,g.roughnessMapTransform)),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)}function p(g,f,M){g.ior.value=f.ior,f.sheen>0&&(g.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),g.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(g.sheenColorMap.value=f.sheenColorMap,t(f.sheenColorMap,g.sheenColorMapTransform)),f.sheenRoughnessMap&&(g.sheenRoughnessMap.value=f.sheenRoughnessMap,t(f.sheenRoughnessMap,g.sheenRoughnessMapTransform))),f.clearcoat>0&&(g.clearcoat.value=f.clearcoat,g.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(g.clearcoatMap.value=f.clearcoatMap,t(f.clearcoatMap,g.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,t(f.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(g.clearcoatNormalMap.value=f.clearcoatNormalMap,t(f.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===Jt&&g.clearcoatNormalScale.value.negate())),f.dispersion>0&&(g.dispersion.value=f.dispersion),f.retroreflectivity>0&&(g.retroreflectivity.value=f.retroreflectivity),f.iridescence>0&&(g.iridescence.value=f.iridescence,g.iridescenceIOR.value=f.iridescenceIOR,g.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(g.iridescenceMap.value=f.iridescenceMap,t(f.iridescenceMap,g.iridescenceMapTransform)),f.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=f.iridescenceThicknessMap,t(f.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),f.transmission>0&&(g.transmission.value=f.transmission,g.transmissionSamplerMap.value=M.texture,g.transmissionSamplerSize.value.set(M.width,M.height),f.transmissionMap&&(g.transmissionMap.value=f.transmissionMap,t(f.transmissionMap,g.transmissionMapTransform)),g.thickness.value=f.thickness,f.thicknessMap&&(g.thicknessMap.value=f.thicknessMap,t(f.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=f.attenuationDistance,g.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(g.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(g.anisotropyMap.value=f.anisotropyMap,t(f.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=f.specularIntensity,g.specularColor.value.copy(f.specularColor),f.specularColorMap&&(g.specularColorMap.value=f.specularColorMap,t(f.specularColorMap,g.specularColorMapTransform)),f.specularIntensityMap&&(g.specularIntensityMap.value=f.specularIntensityMap,t(f.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,f){f.matcap&&(g.matcap.value=f.matcap)}function y(g,f){let M=e.get(f).light;g.referencePosition.value.setFromMatrixPosition(M.matrixWorld),g.nearDistance.value=M.shadow.camera.near,g.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function Uv(n,e,t,i){let s={},r={},a=[],o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,E){let w=E.program;i.uniformBlockBinding(S,w)}function c(S,E){let w=s[S.id];w===void 0&&(g(S),w=u(S),s[S.id]=w,S.addEventListener("dispose",M));let I=E.program;i.updateUBOMapping(S,I);let v=e.render.frame;r[S.id]!==v&&(h(S),r[S.id]=v)}function u(S){let E=d();S.__bindingPointIndex=E;let w=n.createBuffer(),I=S.__size,v=S.usage;return n.bindBuffer(n.UNIFORM_BUFFER,w),n.bufferData(n.UNIFORM_BUFFER,I,v),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,E,w),w}function d(){for(let S=0;S<o;S++)if(a.indexOf(S)===-1)return a.push(S),S;return ke("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(S){let E=s[S.id],w=S.uniforms,I=S.__cache;n.bindBuffer(n.UNIFORM_BUFFER,E);for(let v=0,R=w.length;v<R;v++){let D=w[v];if(Array.isArray(D))for(let O=0,P=D.length;O<P;O++)p(D[O],v,O,I);else p(D,v,0,I)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function p(S,E,w,I){if(y(S,E,w,I)===!0){let v=S.__offset,R=S.value;if(Array.isArray(R)){let D=0;for(let O=0;O<R.length;O++){let P=R[O],X=f(P);m(P,S.__data,D),typeof P!="number"&&typeof P!="boolean"&&!P.isMatrix3&&!ArrayBuffer.isView(P)&&(D+=X.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(R,S.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,v,S.__data)}}function m(S,E,w){typeof S=="number"||typeof S=="boolean"?E[0]=S:S.isMatrix3?(E[0]=S.elements[0],E[1]=S.elements[1],E[2]=S.elements[2],E[3]=0,E[4]=S.elements[3],E[5]=S.elements[4],E[6]=S.elements[5],E[7]=0,E[8]=S.elements[6],E[9]=S.elements[7],E[10]=S.elements[8],E[11]=0):ArrayBuffer.isView(S)?E.set(new S.constructor(S.buffer,S.byteOffset,E.length)):S.toArray(E,w)}function y(S,E,w,I){let v=S.value,R=E+"_"+w;if(I[R]===void 0)return typeof v=="number"||typeof v=="boolean"?I[R]=v:ArrayBuffer.isView(v)?I[R]=v.slice():I[R]=v.clone(),!0;{let D=I[R];if(typeof v=="number"||typeof v=="boolean"){if(D!==v)return I[R]=v,!0}else{if(ArrayBuffer.isView(v))return!0;if(D.equals(v)===!1)return D.copy(v),!0}}return!1}function g(S){let E=S.uniforms,w=0,I=16;for(let R=0,D=E.length;R<D;R++){let O=Array.isArray(E[R])?E[R]:[E[R]];for(let P=0,X=O.length;P<X;P++){let b=O[P],T=Array.isArray(b.value)?b.value:[b.value];for(let k=0,V=T.length;k<V;k++){let re=T[k],Z=f(re),ne=w%I,se=ne%Z.boundary,De=ne+se;w+=se,De!==0&&I-De<Z.storage&&(w+=I-De),b.__data=new Float32Array(Z.storage/Float32Array.BYTES_PER_ELEMENT),b.__offset=w,w+=Z.storage}}}let v=w%I;return v>0&&(w+=I-v),S.__size=w,S.__cache={},this}function f(S){let E={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(E.boundary=4,E.storage=4):S.isVector2?(E.boundary=8,E.storage=8):S.isVector3||S.isColor?(E.boundary=16,E.storage=12):S.isVector4?(E.boundary=16,E.storage=16):S.isMatrix3?(E.boundary=48,E.storage=48):S.isMatrix4?(E.boundary=64,E.storage=64):S.isTexture?Ue("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(S)?(E.boundary=16,E.storage=S.byteLength):Ue("WebGLRenderer: Unsupported uniform value type.",S),E}function M(S){let E=S.target;E.removeEventListener("dispose",M);let w=a.indexOf(E.__bindingPointIndex);a.splice(w,1),n.deleteBuffer(s[E.id]),delete s[E.id],delete r[E.id]}function C(){for(let S in s)n.deleteBuffer(s[S]);a=[],s={},r={}}return{bind:l,update:c,dispose:C}}var Fv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Vn=null;function Ov(){return Vn===null&&(Vn=new Da(Fv,16,16,Ai,In),Vn.name="DFG_LUT",Vn.minFilter=Bt,Vn.magFilter=Bt,Vn.wrapS=kn,Vn.wrapT=kn,Vn.generateMipmaps=!1,Vn.needsUpdate=!0),Vn}var $o=class{constructor(e={}){let{canvas:t=hd(),context:i=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:h=!1,outputBufferType:p=sn}=e;this.isWebGLRenderer=!0;let m;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=i.getContextAttributes().alpha}else m=a;let y=p,g=new Set([lo,oo,ao]),f=new Set([sn,Rn,Is,Ps,so,ro]),M=new Uint32Array(4),C=new Int32Array(4),S=new U,E=null,w=null,I=[],v=[],R=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=An,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let D=this,O=!1,P=null,X=null,b=null,T=null;this._outputColorSpace=hn;let k=0,V=0,re=null,Z=-1,ne=null,se=new Tt,De=new Tt,Re=null,mt=new tt(0),nt=0,lt=t.width,K=t.height,te=1,be=null,ze=null,ce=new Tt(0,0,lt,K),Ye=new Tt(0,0,lt,K),Mt=!1,Ze=new Ss,it=!1,gt=!1,Qe=new Et,oe=new U,Ce=new Tt,Le={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Ge=!1;function at(){return re===null?te:1}let N=i;function ft(x,L){return t.getContext(x,L)}let qe,A,_,B,W,J,le,ue,j,ee,he,Ie,me,de,Pe,Fe,We,F,fe,Q,pe,xe,ae;try{let x={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"186"}`),t.addEventListener("webglcontextlost",xt,!1),t.addEventListener("webglcontextrestored",ut,!1),t.addEventListener("webglcontextcreationerror",bn,!1),N===null){let L="webgl2";if(N=ft(L,x),N===null)throw ft(L)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Ne()}catch(x){throw t.removeEventListener("webglcontextlost",xt,!1),t.removeEventListener("webglcontextrestored",ut,!1),t.removeEventListener("webglcontextcreationerror",bn,!1),ke("WebGLRenderer: "+x.message),x}function Ne(){qe=new W_(N),qe.init(),pe=new Iv(N,qe),A=new L_(N,qe,e,pe),_=new Rv(N,qe),A.reversedDepthBuffer&&h&&_.buffers.depth.setReversed(!0),X=N.createFramebuffer(),b=N.createFramebuffer(),T=N.createFramebuffer(),B=new $_(N),W=new pv,J=new Cv(N,qe,_,W,A,pe,B),le=new G_(D),ue=new Zp(N),xe=new N_(N,ue),j=new X_(N,ue,B,xe),ee=new Z_(N,j,ue,xe,B),F=new Y_(N,A,J),Pe=new U_(W),he=new fv(D,le,qe,A,xe,Pe),Ie=new Lv(D,W),me=new gv,de=new Sv(qe),We=new P_(D,le,_,ee,m,l),Fe=new Av(D,ee,A),ae=new Uv(N,B,A,_),fe=new D_(N,qe,B),Q=new q_(N,qe,B),B.programs=he.programs,D.capabilities=A,D.extensions=qe,D.properties=W,D.renderLists=me,D.shadowMap=Fe,D.state=_,D.info=B}y!==sn&&(R=new J_(y,t.width,t.height,o,s,r));let Te=new tu(D,N);this.xr=Te,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let x=qe.get("WEBGL_lose_context");x&&x.loseContext()},this.forceContextRestore=function(){let x=qe.get("WEBGL_lose_context");x&&x.restoreContext()},this.getPixelRatio=function(){return te},this.setPixelRatio=function(x){x!==void 0&&(te=x,this.setSize(lt,K,!1))},this.getSize=function(x){return x.set(lt,K)},this.setSize=function(x,L,q=!0){if(Te.isPresenting){Ue("WebGLRenderer: Can't change size while VR device is presenting.");return}lt=x,K=L,t.width=Math.floor(x*te),t.height=Math.floor(L*te),q===!0&&(t.style.width=x+"px",t.style.height=L+"px"),R!==null&&R.setSize(t.width,t.height),this.setViewport(0,0,x,L)},this.getDrawingBufferSize=function(x){return x.set(lt*te,K*te).floor()},this.setDrawingBufferSize=function(x,L,q){lt=x,K=L,te=q,t.width=Math.floor(x*q),t.height=Math.floor(L*q),this.setViewport(0,0,x,L)},this.setEffects=function(x){if(y===sn){ke("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(x){for(let L=0;L<x.length;L++)if(x[L].isOutputPass===!0){Ue("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}R.setEffects(x||[])},this.getCurrentViewport=function(x){return x.copy(se)},this.getViewport=function(x){return x.copy(ce)},this.setViewport=function(x,L,q,H){x.isVector4?ce.set(x.x,x.y,x.z,x.w):ce.set(x,L,q,H),_.viewport(se.copy(ce).multiplyScalar(te).round())},this.getScissor=function(x){return x.copy(Ye)},this.setScissor=function(x,L,q,H){x.isVector4?Ye.set(x.x,x.y,x.z,x.w):Ye.set(x,L,q,H),_.scissor(De.copy(Ye).multiplyScalar(te).round())},this.getScissorTest=function(){return Mt},this.setScissorTest=function(x){_.setScissorTest(Mt=x)},this.setOpaqueSort=function(x){be=x},this.setTransparentSort=function(x){ze=x},this.getClearColor=function(x){return x.copy(We.getClearColor())},this.setClearColor=function(){We.setClearColor(...arguments)},this.getClearAlpha=function(){return We.getClearAlpha()},this.setClearAlpha=function(){We.setClearAlpha(...arguments)},this.clear=function(x=!0,L=!0,q=!0){let H=0;if(x){let G=!1;if(re!==null){let ve=re.texture.format;G=g.has(ve)}if(G){let ve=re.texture.type,Se=f.has(ve),_e=We.getClearColor(),Me=We.getClearAlpha(),we=_e.r,Ke=_e.g,st=_e.b;Se?(M[0]=we,M[1]=Ke,M[2]=st,M[3]=Me,N.clearBufferuiv(N.COLOR,0,M)):(C[0]=we,C[1]=Ke,C[2]=st,C[3]=Me,N.clearBufferiv(N.COLOR,0,C))}else H|=N.COLOR_BUFFER_BIT}L&&(H|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),q&&(H|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),H!==0&&N.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(x){x.setRenderer(this),P=x},this.dispose=function(){t.removeEventListener("webglcontextlost",xt,!1),t.removeEventListener("webglcontextrestored",ut,!1),t.removeEventListener("webglcontextcreationerror",bn,!1),We.dispose(),me.dispose(),de.dispose(),W.dispose(),le.dispose(),ee.dispose(),xe.dispose(),ae.dispose(),he.dispose(),Te.dispose(),Te.removeEventListener("sessionstart",au),Te.removeEventListener("sessionend",ou),Ri.stop()};function xt(x){x.preventDefault(),Uc("WebGLRenderer: Context Lost."),O=!0}function ut(){Uc("WebGLRenderer: Context Restored."),O=!1;let x=B.autoReset,L=Fe.enabled,q=Fe.autoUpdate,H=Fe.needsUpdate,G=Fe.type;Ne(),B.autoReset=x,Fe.enabled=L,Fe.autoUpdate=q,Fe.needsUpdate=H,Fe.type=G}function bn(x){ke("WebGLRenderer: A WebGL context could not be created. Reason: ",x.statusMessage)}function Dn(x){let L=x.target;L.removeEventListener("dispose",Dn),ef(L)}function ef(x){tf(x),W.remove(x)}function tf(x){let L=W.get(x).programs;L!==void 0&&(L.forEach(function(q){he.releaseProgram(q)}),x.isShaderMaterial&&he.releaseShaderCache(x))}this.renderBufferDirect=function(x,L,q,H,G,ve){L===null&&(L=Le);let Se=G.isMesh&&G.matrixWorld.determinantAffine()<0,_e=rf(x,L,q,H,G);_.setMaterial(H,Se);let Me=q.index,we=1;if(H.wireframe===!0){if(Me=j.getWireframeAttribute(q),Me===void 0)return;we=2}let Ke=q.drawRange,st=q.attributes.position,Ee=Ke.start*we,ht=(Ke.start+Ke.count)*we;ve!==null&&(Ee=Math.max(Ee,ve.start*we),ht=Math.min(ht,(ve.start+ve.count)*we)),Me!==null?(Ee=Math.max(Ee,0),ht=Math.min(ht,Me.count)):st!=null&&(Ee=Math.max(Ee,0),ht=Math.min(ht,st.count));let At=ht-Ee;if(At<0||At===1/0)return;xe.setup(G,H,_e,q,Me);let bt,vt=fe;if(Me!==null&&(bt=ue.get(Me),vt=Q,vt.setIndex(bt)),G.isMesh)H.wireframe===!0?(_.setLineWidth(H.wireframeLinewidth*at()),vt.setMode(N.LINES)):vt.setMode(N.TRIANGLES);else if(G.isLine){let Ht=H.linewidth;Ht===void 0&&(Ht=1),_.setLineWidth(Ht*at()),G.isLineSegments?vt.setMode(N.LINES):G.isLineLoop?vt.setMode(N.LINE_LOOP):vt.setMode(N.LINE_STRIP)}else G.isPoints?vt.setMode(N.POINTS):G.isSprite&&vt.setMode(N.TRIANGLES);if(G.isBatchedMesh)if(qe.get("WEBGL_multi_draw"))vt.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{let Ht=G._multiDrawStarts,ye=G._multiDrawCounts,Zt=G._multiDrawCount,ct=Me?ue.get(Me).bytesPerElement:1,gn=W.get(H).currentProgram.getUniforms();for(let Ln=0;Ln<Zt;Ln++)gn.setValue(N,"_gl_DrawID",Ln),vt.render(Ht[Ln]/ct,ye[Ln])}else if(G.isInstancedMesh)vt.renderInstances(Ee,At,G.count);else if(q.isInstancedBufferGeometry){let Ht=q._maxInstanceCount!==void 0?q._maxInstanceCount:1/0,ye=Math.min(q.instanceCount,Ht);vt.renderInstances(Ee,At,ye)}else vt.render(Ee,At)};function ru(x,L,q,H){P!==null&&x.isNodeMaterial&&P.setObject(H,x),it===!0&&Pe.setState(x,q,!1),x.transparent===!0&&x.side===jt&&x.forceSinglePass===!1?(x.side=Jt,x.needsUpdate=!0,Nr(x,L,H),x.side=Mi,x.needsUpdate=!0,Nr(x,L,H),x.side=jt):Nr(x,L,H)}this.compile=function(x,L,q=null){q===null&&(q=x),P!==null&&P.renderStart(x,L,q),w=de.get(q),w.init(L),v.push(w),q.traverseVisible(function(G){G.isLight&&G.layers.test(L.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),x!==q&&x.traverseVisible(function(G){G.isLight&&G.layers.test(L.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),w.setupLights(),P!==null&&P.updateLights(w.state.lightsArray),gt=this.localClippingEnabled,it=Pe.init(this.clippingPlanes,gt),it===!0&&Pe.setGlobalState(this.clippingPlanes,L),P!==null&&Fe.render(w.state.shadowsArray,q,L);let H=new Set;return x.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;let ve=G.material;if(ve)if(Array.isArray(ve))for(let Se=0;Se<ve.length;Se++){let _e=ve[Se];ru(_e,q,L,G),H.add(_e)}else ru(ve,q,L,G),H.add(ve)}),w=v.pop(),P!==null&&P.renderEnd(),H},this.compileAsync=function(x,L,q=null){let H=this.compile(x,L,q);return new Promise(G=>{function ve(){if(H.forEach(function(Se){let Me=W.get(Se).currentProgram;(Me===void 0||Me.isReady())&&H.delete(Se)}),H.size===0){G(x);return}setTimeout(ve,10)}qe.get("KHR_parallel_shader_compile")!==null?ve():setTimeout(ve,10)})};let sl=null;function nf(x){sl&&sl(x)}function au(){Ri.stop()}function ou(){Ri.start()}let Ri=new zd;Ri.setAnimationLoop(nf),typeof self<"u"&&Ri.setContext(self),this.setAnimationLoop=function(x){sl=x,Te.setAnimationLoop(x),x===null?Ri.stop():Ri.start()},Te.addEventListener("sessionstart",au),Te.addEventListener("sessionend",ou),this.render=function(x,L){if(L!==void 0&&L.isCamera!==!0){ke("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(O===!0)return;P!==null&&P.renderStart(x,L);let q=Te.enabled===!0&&Te.isPresenting===!0,H=R!==null&&(re===null||q)&&R.begin(D,re);if(x.matrixWorldAutoUpdate===!0&&x.updateMatrixWorld(),L.parent===null&&L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),Te.enabled===!0&&Te.isPresenting===!0&&(R===null||R.isCompositing()===!1)&&(Te.cameraAutoUpdate===!0&&Te.updateCamera(L),L=Te.getCamera()),x.isScene===!0&&x.onBeforeRender(D,x,L,re),w=de.get(x,v.length),w.init(L),w.state.textureUnits=J.getTextureUnits(),v.push(w),Qe.multiplyMatrices(L.projectionMatrix,L.matrixWorldInverse),Ze.setFromProjectionMatrix(Qe,Tn,L.reversedDepth),gt=this.localClippingEnabled,it=Pe.init(this.clippingPlanes,gt),E=me.get(x,I.length),E.init(),I.push(E),Te.enabled===!0&&Te.isPresenting===!0){let Se=D.xr.getDepthSensingMesh();Se!==null&&rl(Se,L,-1/0,D.sortObjects)}rl(x,L,0,D.sortObjects),E.finish(),P!==null&&P.updateLights(w.state.lightsArray),D.sortObjects===!0&&E.sort(be,ze),Ge=Te.enabled===!1||Te.isPresenting===!1||Te.hasDepthSensing()===!1,Ge&&We.addToRenderList(E,x),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),it===!0&&Pe.beginShadows();let G=w.state.shadowsArray;if(Fe.render(G,x,L),it===!0&&Pe.endShadows(),(H&&R.hasRenderPass())===!1){let Se=E.opaque,_e=E.transmissive;if(w.setupLights(),L.isArrayCamera){let Me=L.cameras;if(_e.length>0)for(let we=0,Ke=Me.length;we<Ke;we++){let st=Me[we];cu(Se,_e,x,st)}Ge&&We.render(x);for(let we=0,Ke=Me.length;we<Ke;we++){let st=Me[we];lu(E,x,st,st.viewport)}}else _e.length>0&&cu(Se,_e,x,L),Ge&&We.render(x),lu(E,x,L)}re!==null&&V===0&&(J.updateMultisampleRenderTarget(re),J.updateRenderTargetMipmap(re)),H&&R.end(D),x.isScene===!0&&x.onAfterRender(D,x,L),xe.resetDefaultState(),Z=-1,ne=null,v.pop(),v.length>0?(w=v[v.length-1],J.setTextureUnits(w.state.textureUnits),it===!0&&Pe.setGlobalState(D.clippingPlanes,w.state.camera)):w=null,I.pop(),I.length>0?E=I[I.length-1]:E=null,P!==null&&P.renderEnd()};function rl(x,L,q,H){if(x.visible===!1)return;if(x.layers.test(L.layers)){if(x.isGroup)q=x.renderOrder;else if(x.isLOD)x.autoUpdate===!0&&x.update(L);else if(x.isLightProbeGrid)w.pushLightProbeGrid(x);else if(x.isLight)w.pushLight(x),x.castShadow&&w.pushShadow(x);else if(x.isSprite){if(!x.frustumCulled||x.intersectsFrustum(Ze)){H&&Ce.setFromMatrixPosition(x.matrixWorld).applyMatrix4(Qe);let Se=ee.update(x),_e=x.material;_e.visible&&E.push(x,Se,_e,q,Ce.z,null,L)}}else if((x.isMesh||x.isLine||x.isPoints)&&(!x.frustumCulled||x.intersectsFrustum(Ze))){let Se=ee.update(x),_e=x.material;if(H&&(x.boundingSphere!==void 0?(x.boundingSphere===null&&x.computeBoundingSphere(),Ce.copy(x.boundingSphere.center)):(Se.boundingSphere===null&&Se.computeBoundingSphere(),Ce.copy(Se.boundingSphere.center)),Ce.applyMatrix4(x.matrixWorld).applyMatrix4(Qe)),Array.isArray(_e)){let Me=Se.groups;for(let we=0,Ke=Me.length;we<Ke;we++){let st=Me[we],Ee=_e[st.materialIndex];Ee&&Ee.visible&&E.push(x,Se,Ee,q,Ce.z,st,L)}}else _e.visible&&E.push(x,Se,_e,q,Ce.z,null,L)}}let ve=x.children;for(let Se=0,_e=ve.length;Se<_e;Se++)rl(ve[Se],L,q,H)}function lu(x,L,q,H){let{opaque:G,transmissive:ve,transparent:Se}=x;w.setupLightsView(q),it===!0&&Pe.setGlobalState(D.clippingPlanes,q),H&&_.viewport(se.copy(H)),G.length>0&&Pr(G,L,q),ve.length>0&&Pr(ve,L,q),Se.length>0&&Pr(Se,L,q),_.buffers.depth.setTest(!0),_.buffers.depth.setMask(!0),_.buffers.color.setMask(!0),_.setPolygonOffset(!1)}function cu(x,L,q,H){if((q.isScene===!0?q.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[H.id]===void 0){let Ee=qe.has("EXT_color_buffer_half_float")||qe.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[H.id]=new nn(1,1,{generateMipmaps:!0,type:Ee?In:sn,minFilter:Ti,samples:Math.max(4,A.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:ot.workingColorSpace})}let ve=w.state.transmissionRenderTarget[H.id],Se=H.viewport||se;ve.setSize(Se.z*D.transmissionResolutionScale,Se.w*D.transmissionResolutionScale);let _e=D.getRenderTarget(),Me=D.getActiveCubeFace(),we=D.getActiveMipmapLevel();D.setRenderTarget(ve),D.getClearColor(mt),nt=D.getClearAlpha(),nt<1&&D.setClearColor(16777215,.5),D.clear(),Ge&&We.render(q);let Ke=D.toneMapping;D.toneMapping=An;let st=H.viewport;if(H.viewport!==void 0&&(H.viewport=void 0),w.setupLightsView(H),it===!0&&Pe.setGlobalState(D.clippingPlanes,H),Pr(x,q,H),J.updateMultisampleRenderTarget(ve),J.updateRenderTargetMipmap(ve),qe.has("WEBGL_multisampled_render_to_texture")===!1){let Ee=!1;for(let ht=0,At=L.length;ht<At;ht++){let bt=L[ht],{object:vt,geometry:Ht,material:ye,group:Zt}=bt;if(ye.side===jt&&vt.layers.test(H.layers)){let ct=ye.side;ye.side=Jt,ye.needsUpdate=!0,uu(vt,q,H,Ht,ye,Zt),ye.side=ct,ye.needsUpdate=!0,Ee=!0}}Ee===!0&&(J.updateMultisampleRenderTarget(ve),J.updateRenderTargetMipmap(ve))}D.setRenderTarget(_e,Me,we),D.setClearColor(mt,nt),st!==void 0&&(H.viewport=st),D.toneMapping=Ke}function Pr(x,L,q){let H=L.isScene===!0?L.overrideMaterial:null;for(let G=0,ve=x.length;G<ve;G++){let Se=x[G],{object:_e,geometry:Me,group:we}=Se,Ke=Se.material;Ke.allowOverride===!0&&H!==null&&(Ke=H),_e.layers.test(q.layers)&&uu(_e,L,q,Me,Ke,we)}}function uu(x,L,q,H,G,ve){P!==null&&G.isNodeMaterial&&P.setObject(x,G),x.onBeforeRender(D,L,q,H,G,ve),x.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,x.matrixWorld),x.normalMatrix.getNormalMatrix(x.modelViewMatrix),G.onBeforeRender(D,L,q,H,x,ve),G.transparent===!0&&G.side===jt&&G.forceSinglePass===!1?(G.side=Jt,G.needsUpdate=!0,D.renderBufferDirect(q,L,H,G,x,ve),G.side=Mi,G.needsUpdate=!0,D.renderBufferDirect(q,L,H,G,x,ve),G.side=jt):D.renderBufferDirect(q,L,H,G,x,ve),x.onAfterRender(D,L,q,H,G,ve)}function Nr(x,L,q){L.isScene!==!0&&(L=Le);let H=W.get(x),G=w.state.lights,ve=w.state.shadowsArray,Se=G.state.version,_e=he.getParameters(x,G.state,ve,L,q,w.state.lightProbeGridArray),Me=he.getProgramCacheKey(_e),we=H.programs;H.environment=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?L.environment:null,H.fog=L.fog;let Ke=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap;H.envMap=le.get(x.envMap||H.environment,Ke),H.envMapRotation=H.environment!==null&&x.envMap===null?L.environmentRotation:x.envMapRotation,we===void 0&&(x.addEventListener("dispose",Dn),we=new Map,H.programs=we);let st=we.get(Me);if(st!==void 0){if(H.currentProgram===st&&H.lightsStateVersion===Se)return du(x,_e),st}else _e.uniforms=he.getUniforms(x),P!==null&&x.isNodeMaterial&&P.build(x,q,_e),x.onBeforeCompile(_e,D),st=he.acquireProgram(_e,Me),we.set(Me,st),H.uniforms=_e.uniforms;let Ee=H.uniforms;return(!x.isShaderMaterial&&!x.isRawShaderMaterial||x.clipping===!0)&&(Ee.clippingPlanes=Pe.uniform),du(x,_e),H.needsLights=of(x),H.lightsStateVersion=Se,H.needsLights&&(Ee.ambientLightColor.value=G.state.ambient,Ee.lightProbe.value=G.state.probe,Ee.sunLights.value=G.state.sun,Ee.sunLightShadows.value=G.state.sunShadow,Ee.directionalLights.value=G.state.directional,Ee.directionalLightShadows.value=G.state.directionalShadow,Ee.spotLights.value=G.state.spot,Ee.spotLightShadows.value=G.state.spotShadow,Ee.rectAreaLights.value=G.state.rectArea,Ee.ltc_1.value=G.state.rectAreaLTC1,Ee.ltc_2.value=G.state.rectAreaLTC2,Ee.pointLights.value=G.state.point,Ee.pointLightShadows.value=G.state.pointShadow,Ee.hemisphereLights.value=G.state.hemi,Ee.sunShadowMatrix.value=G.state.sunShadowMatrix,Ee.sunShadowCascade.value=G.state.sunShadowCascade,Ee.directionalShadowMatrix.value=G.state.directionalShadowMatrix,Ee.spotLightMatrix.value=G.state.spotLightMatrix,Ee.spotLightMap.value=G.state.spotLightMap,Ee.pointShadowMatrix.value=G.state.pointShadowMatrix),H.lightProbeGrid=w.state.lightProbeGridArray.length>0,H.currentProgram=st,H.uniformsList=null,st}function hu(x){if(x.uniformsList===null){let L=x.currentProgram.getUniforms();x.uniformsList=Us.seqWithValue(L.seq,x.uniforms)}return x.uniformsList}function du(x,L){let q=W.get(x);q.outputColorSpace=L.outputColorSpace,q.batching=L.batching,q.batchingColor=L.batchingColor,q.instancing=L.instancing,q.instancingColor=L.instancingColor,q.instancingMorph=L.instancingMorph,q.skinning=L.skinning,q.morphTargets=L.morphTargets,q.morphNormals=L.morphNormals,q.morphColors=L.morphColors,q.morphTargetsCount=L.morphTargetsCount,q.numClippingPlanes=L.numClippingPlanes,q.numIntersection=L.numClipIntersection,q.vertexAlphas=L.vertexAlphas,q.vertexTangents=L.vertexTangents,q.toneMapping=L.toneMapping}function sf(x,L){if(x.length===0)return null;if(x.length===1)return x[0].texture!==null?x[0]:null;S.setFromMatrixPosition(L.matrixWorld);for(let q=0,H=x.length;q<H;q++){let G=x[q];if(G.texture!==null&&G.boundingBox.containsPoint(S))return G}return null}function rf(x,L,q,H,G){L.isScene!==!0&&(L=Le),J.resetTextureUnits();let ve=L.fog,Se=H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial?L.environment:null,_e=re===null?D.outputColorSpace:re.isXRRenderTarget===!0?re.texture.colorSpace:ot.workingColorSpace,Me=H.isMeshStandardMaterial||H.isMeshLambertMaterial&&!H.envMap||H.isMeshPhongMaterial&&!H.envMap,we=le.get(H.envMap||Se,Me),Ke=H.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,st=!!q.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),Ee=!!q.morphAttributes.position,ht=!!q.morphAttributes.normal,At=!!q.morphAttributes.color,bt=An;H.toneMapped&&(re===null||re.isXRRenderTarget===!0)&&(bt=D.toneMapping);let vt=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,Ht=vt!==void 0?vt.length:0,ye=W.get(H),Zt=w.state.lights;if(it===!0&&(gt===!0||x!==ne)){let yt=x===ne&&H.id===Z;Pe.setState(H,x,yt)}let ct=!1;H.version===ye.__version?(ye.needsLights&&ye.lightsStateVersion!==Zt.state.version||ye.outputColorSpace!==_e||G.isBatchedMesh&&ye.batching===!1||!G.isBatchedMesh&&ye.batching===!0||G.isBatchedMesh&&ye.batchingColor===!0&&G._colorsTexture===null||G.isBatchedMesh&&ye.batchingColor===!1&&G._colorsTexture!==null||G.isInstancedMesh&&ye.instancing===!1||!G.isInstancedMesh&&ye.instancing===!0||G.isSkinnedMesh&&ye.skinning===!1||!G.isSkinnedMesh&&ye.skinning===!0||G.isInstancedMesh&&ye.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&ye.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&ye.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&ye.instancingMorph===!1&&G.morphTexture!==null||ye.envMap!==we||H.fog===!0&&ye.fog!==ve||ye.numClippingPlanes!==void 0&&(ye.numClippingPlanes!==Pe.numPlanes||ye.numIntersection!==Pe.numIntersection)||ye.vertexAlphas!==Ke||ye.vertexTangents!==st||ye.morphTargets!==Ee||ye.morphNormals!==ht||ye.morphColors!==At||ye.toneMapping!==bt||ye.morphTargetsCount!==Ht||!!ye.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(ct=!0):(ct=!0,ye.__version=H.version);let gn=ye.currentProgram;ct===!0&&(gn=Nr(H,L,G),P&&H.isNodeMaterial&&P.onUpdateProgram(H,gn,ye));let Ln=!1,ii=!1,Xi=!1,_t=gn.getUniforms(),wt=ye.uniforms;if(_.useProgram(gn.program)&&(Ln=!0,ii=!0,Xi=!0),H.id!==Z&&(Z=H.id,ii=!0),ye.needsLights){let yt=sf(w.state.lightProbeGridArray,G);ye.lightProbeGrid!==yt&&(ye.lightProbeGrid=yt,ii=!0)}if(Ln||ne!==x){_.buffers.depth.getReversed()&&x.reversedDepth!==!0&&(x._reversedDepth=!0,x.updateProjectionMatrix()),_t.setValue(N,"projectionMatrix",x.projectionMatrix),_t.setValue(N,"viewMatrix",x.matrixWorldInverse);let ri=_t.map.cameraPosition;ri!==void 0&&ri.setValue(N,oe.setFromMatrixPosition(x.matrixWorld)),A.logarithmicDepthBuffer&&_t.setValue(N,"logDepthBufFC",2/(Math.log(x.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&_t.setValue(N,"isOrthographic",x.isOrthographicCamera===!0),ne!==x&&(ne=x,ii=!0,Xi=!0)}if(ye.needsLights&&(Zt.state.sunShadowMap.length>0&&_t.setValue(N,"sunShadowMap",Zt.state.sunShadowMap,J),Zt.state.directionalShadowMap.length>0&&_t.setValue(N,"directionalShadowMap",Zt.state.directionalShadowMap,J),Zt.state.spotShadowMap.length>0&&_t.setValue(N,"spotShadowMap",Zt.state.spotShadowMap,J),Zt.state.pointShadowMap.length>0&&_t.setValue(N,"pointShadowMap",Zt.state.pointShadowMap,J)),G.isSkinnedMesh){_t.setOptional(N,G,"bindMatrix"),_t.setOptional(N,G,"bindMatrixInverse");let yt=G.skeleton;yt&&(yt.boneTexture===null&&yt.computeBoneTexture(),_t.setValue(N,"boneTexture",yt.boneTexture,J))}G.isBatchedMesh&&(_t.setOptional(N,G,"batchingTexture"),_t.setValue(N,"batchingTexture",G._matricesTexture,J),_t.setOptional(N,G,"batchingIdTexture"),_t.setValue(N,"batchingIdTexture",G._indirectTexture,J),_t.setOptional(N,G,"batchingColorTexture"),G._colorsTexture!==null&&_t.setValue(N,"batchingColorTexture",G._colorsTexture,J));let si=q.morphAttributes;if((si.position!==void 0||si.normal!==void 0||si.color!==void 0)&&F.update(G,q,gn),(ii||ye.receiveShadow!==G.receiveShadow)&&(ye.receiveShadow=G.receiveShadow,_t.setValue(N,"receiveShadow",G.receiveShadow)),(H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial)&&H.envMap===null&&L.environment!==null&&(wt.envMapIntensity.value=L.environmentIntensity),wt.dfgLUT!==void 0&&(wt.dfgLUT.value=Ov()),ii){if(_t.setValue(N,"toneMappingExposure",D.toneMappingExposure),ye.needsLights&&af(wt,Xi),ve&&H.fog===!0&&Ie.refreshFogUniforms(wt,ve),Ie.refreshMaterialUniforms(wt,H,te,K,w.state.transmissionRenderTarget[x.id]),ye.needsLights&&ye.lightProbeGrid){let yt=ye.lightProbeGrid;wt.probesSH.value=yt.texture,wt.probesMin.value.copy(yt.boundingBox.min),wt.probesMax.value.copy(yt.boundingBox.max),wt.probesResolution.value.copy(yt.resolution)}Us.upload(N,hu(ye),wt,J)}if(H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(Us.upload(N,hu(ye),wt,J),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&_t.setValue(N,"center",G.center),_t.setValue(N,"modelViewMatrix",G.modelViewMatrix),_t.setValue(N,"normalMatrix",G.normalMatrix),_t.setValue(N,"modelMatrix",G.matrixWorld),H.uniformsGroups!==void 0){let yt=H.uniformsGroups;for(let ri=0,qi=yt.length;ri<qi;ri++){let pu=yt[ri];ae.update(pu,gn),ae.bind(pu,gn)}}return gn}function af(x,L){x.ambientLightColor.needsUpdate=L,x.lightProbe.needsUpdate=L,x.sunLights.needsUpdate=L,x.sunLightShadows.needsUpdate=L,x.directionalLights.needsUpdate=L,x.directionalLightShadows.needsUpdate=L,x.pointLights.needsUpdate=L,x.pointLightShadows.needsUpdate=L,x.spotLights.needsUpdate=L,x.spotLightShadows.needsUpdate=L,x.rectAreaLights.needsUpdate=L,x.hemisphereLights.needsUpdate=L}function of(x){return x.isMeshLambertMaterial||x.isMeshToonMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isShadowMaterial||x.isShaderMaterial&&x.lights===!0}this.getActiveCubeFace=function(){return k},this.getActiveMipmapLevel=function(){return V},this.getRenderTarget=function(){return re},this.setRenderTargetTextures=function(x,L,q){let H=W.get(x);H.__autoAllocateDepthBuffer=x.resolveDepthBuffer===!1,H.__autoAllocateDepthBuffer===!1&&(H.__useRenderToTexture=!1),W.get(x.texture).__webglTexture=L,W.get(x.depthTexture).__webglTexture=H.__autoAllocateDepthBuffer?void 0:q,H.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(x,L){let q=W.get(x);q.__webglFramebuffer=L,q.__useDefaultFramebuffer=L===void 0},this.setRenderTarget=function(x,L=0,q=0){re=x,k=L,V=q;let H=null,G=!1,ve=!1;if(x){let _e=W.get(x);if(_e.__useDefaultFramebuffer!==void 0){_.bindFramebuffer(N.FRAMEBUFFER,_e.__webglFramebuffer),se.copy(x.viewport),De.copy(x.scissor),Re=x.scissorTest,_.viewport(se),_.scissor(De),_.setScissorTest(Re),Z=-1;return}else if(_e.__webglFramebuffer===void 0)J.setupRenderTarget(x);else if(_e.__hasExternalTextures)J.rebindTextures(x,W.get(x.texture).__webglTexture,W.get(x.depthTexture).__webglTexture);else if(x.depthBuffer){let Ke=x.depthTexture;if(_e.__boundDepthTexture!==Ke){if(Ke!==null&&W.has(Ke)&&(x.width!==Ke.image.width||x.height!==Ke.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");J.setupDepthRenderbuffer(x)}}let Me=x.texture;(Me.isData3DTexture||Me.isDataArrayTexture||Me.isCompressedArrayTexture)&&(ve=!0);let we=W.get(x).__webglFramebuffer;x.isWebGLCubeRenderTarget?(Array.isArray(we[L])?H=we[L][q]:H=we[L],G=!0):x.samples>0&&J.useMultisampledRTT(x)===!1?H=W.get(x).__webglMultisampledFramebuffer:Array.isArray(we)?H=we[q]:H=we,se.copy(x.viewport),De.copy(x.scissor),Re=x.scissorTest}else se.copy(ce).multiplyScalar(te).floor(),De.copy(Ye).multiplyScalar(te).floor(),Re=Mt;if(q!==0&&(H=X),_.bindFramebuffer(N.FRAMEBUFFER,H)&&_.drawBuffers(x,H),_.viewport(se),_.scissor(De),_.setScissorTest(Re),G){let _e=W.get(x.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+L,_e.__webglTexture,q)}else if(ve){let _e=L;for(let Me=0;Me<x.textures.length;Me++){let we=W.get(x.textures[Me]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+Me,we.__webglTexture,q,_e)}}else if(x!==null&&q!==0){let _e=W.get(x.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,_e.__webglTexture,q)}Z=-1};function fu(x){let L=W.get(x);return(L.__readFormat!==x.format||L.__readType!==x.type)&&(L.__readFormat=x.format,L.__readType=x.type,L.__formatReadable=A.textureFormatReadable(x.format),L.__typeReadable=A.textureTypeReadable(x.type)),L}this.readRenderTargetPixels=function(x,L,q,H,G,ve,Se,_e=0){if(!(x&&x.isWebGLRenderTarget)){ke("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Me=W.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&Se!==void 0&&(Me=Me[Se]),Me){_.bindFramebuffer(N.FRAMEBUFFER,Me);try{let we=x.textures[_e],Ke=we.format,st=we.type;x.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+_e);let Ee=fu(we);if(Ee.__formatReadable===!1){ke("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Ee.__typeReadable===!1){ke("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}L>=0&&L<=x.width-H&&q>=0&&q<=x.height-G&&N.readPixels(L,q,H,G,pe.convert(Ke),pe.convert(st),ve)}finally{let we=re!==null?W.get(re).__webglFramebuffer:null;_.bindFramebuffer(N.FRAMEBUFFER,we)}}},this.readRenderTargetPixelsAsync=async function(x,L,q,H,G,ve,Se,_e=0){if(!(x&&x.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Me=W.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&Se!==void 0&&(Me=Me[Se]),Me)if(L>=0&&L<=x.width-H&&q>=0&&q<=x.height-G){_.bindFramebuffer(N.FRAMEBUFFER,Me);let we=x.textures[_e],Ke=we.format,st=we.type;x.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+_e);let Ee=fu(we);if(Ee.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Ee.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ht=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,ht),N.bufferData(N.PIXEL_PACK_BUFFER,ve.byteLength,N.STREAM_READ),N.readPixels(L,q,H,G,pe.convert(Ke),pe.convert(st),0),N.bindBuffer(N.PIXEL_PACK_BUFFER,null);let At=re!==null?W.get(re).__webglFramebuffer:null;_.bindFramebuffer(N.FRAMEBUFFER,At);let bt=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await fd(N,bt,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,ht),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,ve),N.bindBuffer(N.PIXEL_PACK_BUFFER,null),N.deleteBuffer(ht),N.deleteSync(bt),ve}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(x,L=null,q=0){let H=Math.pow(2,-q),G=Math.floor(x.image.width*H),ve=Math.floor(x.image.height*H),Se=L!==null?L.x:0,_e=L!==null?L.y:0;J.setTexture2D(x,0),N.copyTexSubImage2D(N.TEXTURE_2D,q,0,0,Se,_e,G,ve),_.unbindTexture()},this.copyTextureToTexture=function(x,L,q=null,H=null,G=0,ve=0){let Se,_e,Me,we,Ke,st,Ee,ht,At,bt=x.isCompressedTexture?x.mipmaps[ve]:x.image;if(q!==null)Se=q.max.x-q.min.x,_e=q.max.y-q.min.y,Me=q.isBox3?q.max.z-q.min.z:1,we=q.min.x,Ke=q.min.y,st=q.isBox3?q.min.z:0;else{let wt=Math.pow(2,-G);Se=Math.floor(bt.width*wt),_e=Math.floor(bt.height*wt),x.isDataArrayTexture?Me=bt.depth:x.isData3DTexture?Me=Math.floor(bt.depth*wt):Me=1,we=0,Ke=0,st=0}H!==null?(Ee=H.x,ht=H.y,At=H.z):(Ee=0,ht=0,At=0);let vt=pe.convert(L.format),Ht=pe.convert(L.type),ye;L.isData3DTexture?(J.setTexture3D(L,0),ye=N.TEXTURE_3D):L.isDataArrayTexture||L.isCompressedArrayTexture?(J.setTexture2DArray(L,0),ye=N.TEXTURE_2D_ARRAY):(J.setTexture2D(L,0),ye=N.TEXTURE_2D),_.activeTexture(N.TEXTURE0),_.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,L.flipY),_.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,L.premultiplyAlpha),_.pixelStorei(N.UNPACK_ALIGNMENT,L.unpackAlignment);let Zt=_.getParameter(N.UNPACK_ROW_LENGTH),ct=_.getParameter(N.UNPACK_IMAGE_HEIGHT),gn=_.getParameter(N.UNPACK_SKIP_PIXELS),Ln=_.getParameter(N.UNPACK_SKIP_ROWS),ii=_.getParameter(N.UNPACK_SKIP_IMAGES);_.pixelStorei(N.UNPACK_ROW_LENGTH,bt.width),_.pixelStorei(N.UNPACK_IMAGE_HEIGHT,bt.height),_.pixelStorei(N.UNPACK_SKIP_PIXELS,we),_.pixelStorei(N.UNPACK_SKIP_ROWS,Ke),_.pixelStorei(N.UNPACK_SKIP_IMAGES,st);let Xi=x.isDataArrayTexture||x.isData3DTexture,_t=L.isDataArrayTexture||L.isData3DTexture;if(x.isDepthTexture){let wt=W.get(x),si=W.get(L),yt=W.get(wt.__renderTarget),ri=W.get(si.__renderTarget);_.bindFramebuffer(N.READ_FRAMEBUFFER,yt.__webglFramebuffer),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,ri.__webglFramebuffer);for(let qi=0;qi<Me;qi++)Xi&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,W.get(x).__webglTexture,G,st+qi),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,W.get(L).__webglTexture,ve,At+qi)),N.blitFramebuffer(we,Ke,Se,_e,Ee,ht,Se,_e,N.DEPTH_BUFFER_BIT,N.NEAREST);_.bindFramebuffer(N.READ_FRAMEBUFFER,null),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(G!==0||x.isRenderTargetTexture||W.has(x)){let wt=W.get(x),si=W.get(L);_.bindFramebuffer(N.READ_FRAMEBUFFER,b),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,T);for(let yt=0;yt<Me;yt++)Xi?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,wt.__webglTexture,G,st+yt):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,wt.__webglTexture,G),_t?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,si.__webglTexture,ve,At+yt):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,si.__webglTexture,ve),G!==0?N.blitFramebuffer(we,Ke,Se,_e,Ee,ht,Se,_e,N.COLOR_BUFFER_BIT,N.NEAREST):_t?N.copyTexSubImage3D(ye,ve,Ee,ht,At+yt,we,Ke,Se,_e):N.copyTexSubImage2D(ye,ve,Ee,ht,we,Ke,Se,_e);_.bindFramebuffer(N.READ_FRAMEBUFFER,null),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else _t?x.isDataTexture||x.isData3DTexture?N.texSubImage3D(ye,ve,Ee,ht,At,Se,_e,Me,vt,Ht,bt.data):L.isCompressedArrayTexture?N.compressedTexSubImage3D(ye,ve,Ee,ht,At,Se,_e,Me,vt,bt.data):N.texSubImage3D(ye,ve,Ee,ht,At,Se,_e,Me,vt,Ht,bt):x.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,ve,Ee,ht,Se,_e,vt,Ht,bt.data):x.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,ve,Ee,ht,bt.width,bt.height,vt,bt.data):N.texSubImage2D(N.TEXTURE_2D,ve,Ee,ht,Se,_e,vt,Ht,bt);_.pixelStorei(N.UNPACK_ROW_LENGTH,Zt),_.pixelStorei(N.UNPACK_IMAGE_HEIGHT,ct),_.pixelStorei(N.UNPACK_SKIP_PIXELS,gn),_.pixelStorei(N.UNPACK_SKIP_ROWS,Ln),_.pixelStorei(N.UNPACK_SKIP_IMAGES,ii),ve===0&&L.generateMipmaps&&N.generateMipmap(ye),_.unbindTexture()},this.initRenderTarget=function(x){W.get(x).__webglFramebuffer===void 0&&J.setupRenderTarget(x)},this.initTexture=function(x){x.isCubeTexture?J.setTextureCube(x,0):x.isData3DTexture?J.setTexture3D(x,0):x.isDataArrayTexture||x.isCompressedArrayTexture?J.setTexture2DArray(x,0):J.setTexture2D(x,0),_.unbindTexture()},this.resetState=function(){k=0,V=0,re=null,_.reset(),xe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Tn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=ot._getDrawingBufferColorSpace(e),t.unpackColorSpace=ot._getUnpackColorSpace()}};var $d={type:"change"},iu={type:"start"},Zd={type:"end"},Ko=new Bi,Yd=new dn,Bv=Math.cos(70*Ar.DEG2RAD),Dt=new U,rn=2*Math.PI,pt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},nu=1e-6,Jo=class extends _r{constructor(e,t=null){super(e,t),this.state=pt.NONE,this.target=new U,this.cursor=new U,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:bi.ROTATE,MIDDLE:bi.DOLLY,RIGHT:bi.PAN},this.touches={ONE:Si.ROTATE,TWO:Si.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new U,this._lastQuaternion=new fn,this._lastTargetPosition=new U,this._quat=new fn().setFromUnitVectors(e.up,new U(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new As,this._sphericalDelta=new As,this._scale=1,this._panOffset=new U,this._rotateStart=new Be,this._rotateEnd=new Be,this._rotateDelta=new Be,this._panStart=new Be,this._panEnd=new Be,this._panDelta=new Be,this._dollyStart=new Be,this._dollyEnd=new Be,this._dollyDelta=new Be,this._dollyDirection=new U,this._mouse=new Be,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Vv.bind(this),this._onPointerDown=zv.bind(this),this._onPointerUp=Hv.bind(this),this._onContextMenu=Zv.bind(this),this._onMouseWheel=Xv.bind(this),this._onKeyDown=qv.bind(this),this._onTouchStart=$v.bind(this),this._onTouchMove=Yv.bind(this),this._onMouseDown=Gv.bind(this),this._onMouseMove=Wv.bind(this),this._interceptControlDown=Kv.bind(this),this._interceptControlUp=Jv.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=pt.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let e=this.domElement.getRootNode();e.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),e.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent($d),this.update(),this.state=pt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let t=this.object.position;Dt.copy(t).sub(this.target),Dt.applyQuaternion(this._quat),this._spherical.setFromVector3(Dt),this.autoRotate&&this.state===pt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(i)&&isFinite(s)&&(i<-Math.PI?i+=rn:i>Math.PI&&(i-=rn),s<-Math.PI?s+=rn:s>Math.PI&&(s-=rn),i<=s?this._spherical.theta=Math.max(i,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+s)/2?Math.max(i,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(Dt.setFromSpherical(this._spherical),Dt.applyQuaternion(this._quatInverse),t.copy(this.target).add(Dt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=Dt.length();a=this._clampDistance(o*this._scale);let l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let o=new U(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new U(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=Dt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(Ko.origin.copy(this.object.position),Ko.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Ko.direction))<Bv?this.object.lookAt(this.target):(Yd.setFromNormalAndCoplanarPoint(this.object.up,this.target),Ko.intersectPlane(Yd,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>nu||8*(1-this._lastQuaternion.dot(this.object.quaternion))>nu||this._lastTargetPosition.distanceToSquared(this.target)>nu?(this.dispatchEvent($d),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?rn/60*this.autoRotateSpeed*e:rn/60/60*this.autoRotateSpeed}_getZoomScale(e){let t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Dt.setFromMatrixColumn(t,0),Dt.multiplyScalar(-e),this._panOffset.add(Dt)}_panUp(e,t){this.screenSpacePanning===!0?Dt.setFromMatrixColumn(t,1):(Dt.setFromMatrixColumn(t,0),Dt.crossVectors(this.object.up,Dt)),Dt.multiplyScalar(e),this._panOffset.add(Dt)}_pan(e,t){let i=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Dt.copy(s).sub(this.target);let r=Dt.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/i.clientHeight,this.object.matrix),this._panUp(2*t*r/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let i=this.domElement.getBoundingClientRect(),s=e-i.left,r=t-i.top,a=i.width,o=i.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(rn*this._rotateDelta.x/t.clientHeight),this._rotateUp(rn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(rn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-rn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(rn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-rn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(i,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(i,s)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),i=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(i*i+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let i=this._getSecondPointerPosition(e),s=.5*(e.pageX+i.x),r=.5*(e.pageY+i.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(rn*this._rotateDelta.x/t.clientHeight),this._rotateUp(rn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(i,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),i=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(i*i+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new Be,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}};function zv(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function Vv(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function Hv(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Zd),this.state=pt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function Gv(n){let e;switch(n.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case bi.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=pt.DOLLY;break;case bi.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=pt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=pt.ROTATE}break;case bi.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=pt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=pt.PAN}break;default:this.state=pt.NONE}this.state!==pt.NONE&&this.dispatchEvent(iu)}function Wv(n){switch(this.state){case pt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case pt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case pt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function Xv(n){this.enabled===!1||this.enableZoom===!1||this.state!==pt.NONE||(n.preventDefault(),this.dispatchEvent(iu),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(Zd))}function qv(n){this.enabled!==!1&&this._handleKeyDown(n)}function $v(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case Si.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=pt.TOUCH_ROTATE;break;case Si.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=pt.TOUCH_PAN;break;default:this.state=pt.NONE}break;case 2:switch(this.touches.TWO){case Si.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=pt.TOUCH_DOLLY_PAN;break;case Si.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=pt.TOUCH_DOLLY_ROTATE;break;default:this.state=pt.NONE}break;default:this.state=pt.NONE}this.state!==pt.NONE&&this.dispatchEvent(iu)}function Yv(n){switch(this._trackPointer(n),this.state){case pt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case pt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case pt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case pt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=pt.NONE}}function Zv(n){this.enabled!==!1&&n.preventDefault()}function Kv(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Jv(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var Pn={plate:10134187,device:3112912,connector:14715167,environment:7370880,screwHead:9278363,highlight:14169130,reference:9067765},jo={fixed_obstacle:Pn.environment,screw_head_envelope:Pn.screwHead,sensor_body:Pn.device,connector_access:Pn.connector};function jv(){try{let n=document.createElement("canvas");return!!(n.getContext("webgl2")??n.getContext("webgl")??n.getContext("experimental-webgl"))}catch{return!1}}var Qo=class{available;container;onError;onUserChange;renderer=null;scene=null;camera=null;controls=null;resizeObserver=null;frameHandle=null;tween=null;disposed=!1;groups={plate:new en,device:new en,connector:new en,environment:new en,reference:new en};disposables=[];highlightTargets=new Map;visibility={plate:!0,device:!0,connector:!0,environment:!0};bounds=null;framedOnce=!1;highlightIds=[];constructor(e){if(this.container=e.container,this.onError=e.onError,this.onUserChange=e.onUserChange,this.available=jv(),!this.available){this.onError?.("\u5F53\u524D\u6D4F\u89C8\u5668\u73AF\u5883\u4E0D\u652F\u6301 WebGL\uFF0C\u4E09\u7EF4\u89C6\u56FE\u4E0D\u53EF\u7528\uFF08\u5176\u4F59\u6570\u636E\u4ECD\u53EF\u67E5\u770B\uFF09");return}try{let t=new $o({antialias:!0,alpha:!0});t.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2)),t.setSize(this.container.clientWidth||640,this.container.clientHeight||420,!1),t.domElement.setAttribute("data-fitplate-canvas","1"),t.domElement.style.width="100%",t.domElement.style.height="100%",t.domElement.style.display="block",this.container.appendChild(t.domElement),this.renderer=t;let i=new ir;i.background=null,this.scene=i;for(let c of Object.values(this.groups))i.add(c);let s=new qt(45,(this.container.clientWidth||640)/(this.container.clientHeight||420),.5,2e4);s.up.set(0,0,1),s.position.set(220,-260,220),this.camera=s;let r=new Jo(s,t.domElement);r.enableDamping=!0,r.dampingFactor=.12,r.addEventListener("change",()=>{this.onUserChange?.(),this.invalidate()}),this.controls=r,i.add(new gr(16777215,.75));let a=new pr(14674158,4870231,1.1);a.position.set(0,0,500),i.add(a);let o=new ws(16777215,1.4);o.position.set(320,-420,520),i.add(o);let l=new ws(16777215,.5);l.position.set(-260,300,-180),i.add(l),typeof ResizeObserver<"u"&&(this.resizeObserver=new ResizeObserver(()=>this.handleResize()),this.resizeObserver.observe(this.container)),globalThis.addEventListener("resize",this.handleResize),this.invalidate()}catch(t){this.available=!1,this.onError?.("three.js \u521D\u59CB\u5316\u5931\u8D25\uFF0C\u4E09\u7EF4\u89C6\u56FE\u4E0D\u53EF\u7528\uFF08\u5176\u4F59\u6570\u636E\u4ECD\u53EF\u67E5\u770B\uFF09",t instanceof Error?t.message:String(t)),this.teardown()}}handleResize=()=>{if(!this.renderer||!this.camera)return;let e=this.container.clientWidth||1,t=this.container.clientHeight||1;this.renderer.setSize(e,t,!1),this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),this.invalidate()};setMesh(e){if(this.clearGroup(this.groups.plate),!e||!this.scene)return;let t=new $t;t.setAttribute("position",new kt(e.positions,3)),t.setIndex(new kt(e.indices,1)),t.computeVertexNormals(),t.computeBoundingBox();let i=new _i({color:Pn.plate,metalness:.15,roughness:.78,side:jt,flatShading:!1}),s=new Vt(t,i);if(s.name="plate",s.userData.objectId="plate",this.groups.plate.add(s),this.disposables.push(t,i),this.highlightTargets.set("plate",s),t.boundingBox){let r=t.boundingBox.clone();this.bounds=r.expandByScalar(Math.max(6,r.getSize(new U).length()*.06))}this.framedOnce||(this.framedOnce=!0,this.frameAll()),this.applyHighlight(),this.invalidate()}setReferenceMesh(e){if(this.clearGroup(this.groups.reference),!e||!this.scene)return;let t=new $t;t.setAttribute("position",new kt(e.positions,3)),t.setIndex(new kt(e.indices,1)),t.computeVertexNormals(),t.computeBoundingBox();let i=new _i({color:Pn.reference,metalness:.05,roughness:.9,transparent:!0,opacity:.32,depthWrite:!1,side:jt}),s=new Vt(t,i);s.name="reference",s.userData.objectId="reference",s.renderOrder=1,this.groups.reference.add(s),this.disposables.push(t,i),this.invalidate()}hasReferenceMesh(){return this.groups.reference.children.length>0}setEnvelopes(e){this.clearGroup(this.groups.device),this.clearGroup(this.groups.connector),this.clearGroup(this.groups.environment);for(let t of e){let i=t.id==="sensor_body"?this.groups.device:t.role==="connector_access"?this.groups.connector:this.groups.environment;if(t.kind==="cylinder"){let s=new ur(t.radius,t.radius,t.height,40,1,!1);s.rotateX(Math.PI/2);let r=new _i({color:jo[t.role]??Pn.environment,transparent:!0,opacity:t.role==="screw_head_envelope"?.55:.45,metalness:.1,roughness:.7,side:jt}),a=new Vt(s,r);a.position.set(t.center[0],t.center[1],t.center[2]),a.name=t.id,a.userData.objectId=t.id,a.userData.role=t.role,a.userData.movable=t.movable,i.add(a),this.disposables.push(s,r),this.highlightTargets.set(t.id,a),this.addEdges(a,s,jo[t.role]??Pn.environment)}else{let s=new gi(t.size[0],t.size[1],t.size[2]),r=new _i({color:jo[t.role]??Pn.device,transparent:!0,opacity:.38,metalness:.05,roughness:.6,side:jt}),a=new Vt(s,r);a.position.set(t.center[0],t.center[1],t.center[2]),a.name=t.id,a.userData.objectId=t.id,a.userData.role=t.role,a.userData.movable=t.movable,i.add(a),this.disposables.push(s,r),this.highlightTargets.set(t.id,a),this.addEdges(a,s,jo[t.role]??Pn.device)}}this.applyVisibility(),this.applyHighlight(),this.invalidate()}addEdges(e,t,i){let s=new hr(t),r=new Ms({color:i,transparent:!0,opacity:.85}),a=new or(s,r);e.add(a),this.disposables.push(s,r)}clearGroup(e){for(let t of[...e.children]){e.remove(t);let i=t;i.userData?.objectId&&this.highlightTargets.delete(i.userData.objectId)}}teardown(){this.renderer&&(this.container.removeChild(this.renderer.domElement),this.renderer.dispose(),this.renderer.forceContextLoss(),this.renderer=null),this.controls?.dispose(),this.controls=null,this.scene=null,this.camera=null}setVisibility(e){Object.assign(this.visibility,e),this.applyVisibility(),this.invalidate()}getVisibility(){return{...this.visibility}}applyVisibility(){this.groups.plate.visible=this.visibility.plate,this.groups.device.visible=this.visibility.device,this.groups.connector.visible=this.visibility.connector,this.groups.environment.visible=this.visibility.environment}setHighlight(e){this.highlightIds=[...e],this.applyHighlight(),this.invalidate()}getHighlight(){return[...this.highlightIds]}applyHighlight(){for(let[e,t]of this.highlightTargets){let i=t.material,s=this.highlightIds.includes(e);i.userData.base||(i.userData.base={color:i.color.getHex(),opacity:i.opacity,transparent:i.transparent,emissive:i.emissive?i.emissive.getHex():0});let r=i.userData.base;s?(i.color.setHex(Pn.highlight),i.emissive?.setHex(5902088),i.opacity=Math.max(r.opacity,.75),i.transparent=!0):(i.color.setHex(r.color),i.emissive?.setHex(r.emissive),i.opacity=r.opacity,i.transparent=r.transparent),i.needsUpdate=!0}}setCamera(e){if(!this.camera||!this.controls)return;let t=this.bounds??new xn(new U(-60,-60,0),new U(60,60,10)),i=t.getCenter(new U),s=Math.max(t.getSize(new U).length()*.9,80),r=e==="top"?new U(0,0,1):e==="side"?new U(1,0,0):e==="front"?new U(0,-1,0):new U(1,-1.15,.85).normalize();this.controls.target.copy(i),this.camera.position.copy(i.clone().add(r.multiplyScalar(s))),e==="top"?(this.camera.up.set(0,1,0),this.camera.position.copy(i.clone().add(new U(0,.001,s)))):this.camera.up.set(0,0,1),this.camera.updateProjectionMatrix(),this.controls.update(),this.invalidate()}resetCamera(){this.frameAll()}frameAll(){let e=this.bounds??new xn(new U(-60,-60,0),new U(60,60,10)),t=e.getCenter(new U),i=new U(.85,-1.05,.75).normalize(),s=new U(0,0,1).cross(i).normalize(),r=i.clone().cross(s).normalize(),a=Math.tan(Ar.degToRad((this.camera?.fov??45)/2)),o=a*Math.max(this.camera?.aspect??1,.1),l=60;for(let c of[e.min.x,e.max.x])for(let u of[e.min.y,e.max.y])for(let d of[e.min.z,e.max.z]){let h=new U(c,u,d).sub(t);l=Math.max(l,h.dot(i)+Math.max(Math.abs(h.dot(s))/o,Math.abs(h.dot(r))/a))}l*=1.12,this.camera&&this.controls&&(this.camera.up.set(0,0,1),this.camera.position.copy(t.clone().add(new U(.85,-1.05,.75).normalize().multiplyScalar(l))),this.controls.target.copy(t),this.camera.updateProjectionMatrix(),this.controls.update()),this.invalidate()}focusObjects(e){let t=e.map(o=>this.highlightTargets.get(o)).filter(o=>!!o);if(t.length===0||!this.camera||!this.controls)return;let i=new xn;for(let o of t)o.updateWorldMatrix(!0,!1),i.expandByObject(o);if(i.isEmpty())return;let s=i.getCenter(new U),r=Math.max(i.getSize(new U).length(),20),a=this.camera.position.clone().sub(this.controls.target);a.lengthSq()<1e-6&&a.set(1,-1,.8),a.normalize(),this.controls.target.copy(s),this.camera.position.copy(s.clone().add(a.multiplyScalar(r*1.6))),this.controls.update(),this.invalidate()}getCameraState(){if(!this.camera||!this.controls)return null;let{x:e,y:t,z:i}=this.camera.position,s=this.controls.target;return{position:[e,t,i],target:[s.x,s.y,s.z]}}setCameraState(e){!this.camera||!this.controls||(this.camera.position.set(e.position[0],e.position[1],e.position[2]),this.controls.target.set(e.target[0],e.target[1],e.target[2]),this.controls.update(),this.invalidate())}animatePoseDelta(e){if(!this.scene||!this.camera)return;let t=new en;t.name="pose-delta",t.position.set(e.dx,e.dy,e.dz),t.add(this.groups.device,this.groups.connector),this.scene.add(t),this.tween={group:t,from:new U(e.dx,e.dy,e.dz),to:new U(0,0,0),startedAt:performance.now(),durationMs:700,label:e.label},this.invalidate()}get activeTweenLabel(){return this.tween?.label??null}stepTween(e){if(!this.tween||!this.scene)return!1;let t=Math.min(1,(e-this.tween.startedAt)/this.tween.durationMs),i=1-(1-t)*(1-t);if(this.tween.group.position.lerpVectors(this.tween.from,this.tween.to,i),t>=1){let{group:s}=this.tween;s.remove(this.groups.device,this.groups.connector),this.scene.add(this.groups.device,this.groups.connector),this.scene.remove(s),this.tween=null}return this.tween!==null}invalidate(){this.disposed||!this.renderer||this.frameHandle!==null||(this.frameHandle=requestAnimationFrame(this.renderFrame))}renderFrame=e=>{if(this.frameHandle=null,!this.renderer||!this.scene||!this.camera)return;let t=this.stepTween(e);this.controls?.update(),this.renderer.render(this.scene,this.camera),t&&this.invalidate()};get isDisposed(){return this.disposed}describe(){return{plate:this.groups.plate.children.length,device:this.groups.device.children.length,connector:this.groups.connector.children.length,environment:this.groups.environment.children.length,highlight:this.getHighlight()}}dispose(){if(!this.disposed){this.disposed=!0,this.frameHandle!==null&&(cancelAnimationFrame(this.frameHandle),this.frameHandle=null),this.tween=null,this.resizeObserver?.disconnect(),this.resizeObserver=null,globalThis.removeEventListener("resize",this.handleResize);for(let e of Object.values(this.groups)){this.clearGroup(e);for(let t of[...e.children])t.geometry?.dispose()}for(let e of this.disposables)e.dispose();this.disposables.length=0,this.highlightTargets.clear(),this.teardown()}}};import{Fragment as il,jsx as Y,jsxs as ie}from"react/jsx-runtime";var ex={PASS:"\u901A\u8FC7",FAIL:"\u5931\u8D25",UNKNOWN:"\u672A\u786E\u5B9A",BORDERLINE:"\u4E34\u754C"},Kd={"stale-revision":"\u6309\u65E7\u8981\u6C42","stale-binding":"\u62A5\u544A\u7ED1\u5B9A\u5931\u6548","unverified-metadata":"\u62A5\u544A\u672A\u6838\u5B9E"},tx={"no-session":()=>"\u7B49\u5F85\u4F1A\u8BDD\uFF1A\u8BF7\u5148\u5728 AGH \u4E2D\u9009\u62E9\u6216\u521B\u5EFA\u4E00\u4E2A\u4F1A\u8BDD",loading:()=>"\u6B63\u5728\u8BFB\u53D6 FitPlate \u8FD0\u884C\u6570\u636E\u2026",empty:n=>n.notice?.title??"\u5F53\u524D\u4F1A\u8BDD\u8FD8\u6CA1\u6709 FitPlate \u8FD0\u884C\u8BB0\u5F55",error:n=>n.notice?.title??"\u8BFB\u53D6\u8FD0\u884C\u6570\u636E\u5931\u8D25",ready:n=>`\u8FD0\u884C ${n.run?.runId??""} \xB7 ${n.run?.state??""}`};function nl({status:n}){let e=n.toLowerCase();return Y("span",{className:`fp-badge fp-badge-${e}`,"data-status":n,children:ex[n]??n})}function Jd({values:n,empty:e}){let t=Object.entries(n);return t.length===0?Y("span",{className:"fp-muted",children:e}):Y("span",{className:"fp-chips",children:t.map(([i,s])=>ie("span",{className:"fp-chip",title:i,children:[i,"=",Y("b",{children:Ae(s)})]},i))})}function su({lines:n}){return Y("div",{className:"fp-summary",children:n.map(e=>ie("span",{className:`fp-measure${e.tone?` fp-measure-${e.tone}`:""}`,title:e.hint??void 0,children:[e.label," ",Y("b",{children:e.value})]},e.label))})}function nx(n){return n?`fp-check fp-check-${n.status.toLowerCase()}`:"fp-check fp-check-missing"}function Qd(n){return function(t){let s=tl(n.session.subscribe,n.session.getSnapshot)??t.sessionId,r=tl(n.theme.subscribe,()=>n.theme.theme),a=Wi(()=>(oe,Ce)=>n.agnes.services.call(oe,Ce),[n]),o=Wi(()=>new $r({call:a}),[a]),l=tl(o.subscribe,o.getSnapshot),c=Wi(()=>{let oe=n.session.commands,Ce={read:Le=>{try{return globalThis.localStorage?.getItem(`fitplate.intake-draft.v1.${Le}`)??null}catch{return null}},write:(Le,Ge)=>{try{globalThis.localStorage?.setItem(`fitplate.intake-draft.v1.${Le}`,Ge)}catch{}},clear:Le=>{try{globalThis.localStorage?.removeItem(`fitplate.intake-draft.v1.${Le}`)}catch{}}};return new Br({call:a,commands:{...oe&&typeof oe.prompt=="function"?{prompt:Le=>oe.prompt(Le)}:{},...oe&&typeof oe.followUp=="function"?{followUp:Le=>oe.followUp(Le)}:{}},isBusy:async()=>{let Le=await n.session.projection.read(),Ge=Le&&Le.status==="available"?Le.value?.opState:void 0;return Ge!=null},draftStore:Ce})},[a,n]),u=tl(c.subscribe,c.getSnapshot),[d,h]=ni(!1),[p,m]=ni(!1),[y,g]=ni(null),f=Qv();Nn(()=>{let oe=u.frozen;u.phase==="committed"&&oe?.taskId===l.run?.task?.taskId&&oe?.revision===l.run?.taskRevision&&g(null)},[u.phase,u.frozen,l.run?.task?.taskId,l.run?.taskRevision]),Nn(()=>{h(!1),m(!1),g(null)},[s]),Nn(()=>{o.setSession(s),c.setSession(s)},[o,c,s]),Nn(()=>()=>{o.dispose(),c.dispose()},[o,c]),Nn(()=>{let oe=n.session.projection;if(!(!oe||typeof oe.subscribe!="function"))return oe.subscribe(()=>{o.notifyProjection(),c.refresh()})},[n,o,c]);let M=el(null),C=el(null),[S,E]=ni(null),[w,I]=ni(null),[v,R]=ni({plate:!0,device:!0,connector:!0,environment:!0}),D=el(null),O=el(null);Nn(()=>{let oe=M.current;if(!oe)return;let Ce=new Qo({container:oe,onError:Le=>E(Le)});return C.current=Ce,Ce.available||E("\u5F53\u524D\u6D4F\u89C8\u5668\u73AF\u5883\u4E0D\u652F\u6301 WebGL\uFF0C\u4E09\u7EF4\u89C6\u56FE\u4E0D\u53EF\u7528\uFF08\u5176\u4F59\u6570\u636E\u4ECD\u53EF\u67E5\u770B\uFF09"),globalThis.__fitplateDebug={viewer:Ce,controller:o,intakeController:c,build:Un},()=>{Ce.dispose(),C.current=null,globalThis.__fitplateDebug?.viewer===Ce&&delete globalThis.__fitplateDebug}},[o,c]);let P=l.scene,X=Wi(()=>Hr(P?.report??null),[P?.report]),[b,T]=ni([]),[k,V]=ni(!0),re=Wi(()=>{let oe=l.selectedVersion,Ce=l.versions.find(qe=>qe.version.candidateId===l.selectedCandidateId)??null,Le=P&&Ce?P.reportFreshness:Ce?.freshness??{state:"unverified-metadata",label:"\u62A5\u544A\u672A\u6838\u5B9E"},Ge={candidateId:oe?.candidateId??"\uFF08\u672A\u9009\u62E9\uFF09",stepSha256:oe?.stepSha256??null,report:P?.report??oe?.report??null,freshness:Le,pairs:Wr(P?.evidence??null),design:P?.design??null},at=l.compareBaselineId,N=at?l.versions.find(qe=>qe.version.candidateId===at)??null:null,ft=at?{candidateId:at,stepSha256:N?.version.stepSha256??null,report:l.baselineScene?.report??N?.report??null,freshness:l.baselineScene?.reportFreshness??N?.freshness??{state:"unverified-metadata",label:"\u62A5\u544A\u672A\u6838\u5B9E"},pairs:Wr(l.baselineScene?.evidence??null),design:l.baselineScene?.design??null}:null;return Yu({baseline:ft,current:Ge})},[l,P]),Z=Wi(()=>Wr(P?.evidence??null),[P?.evidence]),ne=Wi(()=>Rl(P?.scene),[P?.scene]),se=P?.identity.candidateId??null;Nn(()=>{T([])},[se]),Nn(()=>{let oe=C.current;!oe||!oe.available||(oe.setMesh(P?.mesh??null),oe.setEnvelopes(P?.envelopes??[]),oe.setVisibility(v),oe.setHighlight(b.length>0?b:X))},[P,v,b,X]),Nn(()=>{let oe=C.current;if(!oe||!oe.available)return;let Ce=l.baselineScene?.mesh??null;oe.setReferenceMesh(k&&Ce?Ce:null)},[l.baselineScene,k]),Nn(()=>{let oe=C.current;if(!oe||!oe.available||!P)return;let Ce=P.pose.center,Le=D.current;if(Le&&Ce&&Le.candidateId!==P.identity.candidateId){let Ge=Le.center[0]-Ce[0],at=Le.center[1]-Ce[1],N=Ce[0]-Le.center[0],ft=Ce[1]-Le.center[1];if(Math.abs(Ge)>1e-6||Math.abs(at)>1e-6){let qe=`\u53D8\u5316\u793A\u610F ${Le.candidateId} \u2192 ${P.identity.candidateId}\uFF1A\u8BBE\u5907\u4F4D\u79FB \u0394=(${N.toFixed(2)}, ${ft.toFixed(2)}) mm\uFF08\u4EC5\u793A\u610F\uFF0C\u4E0D\u662F\u65E0\u78B0\u649E\u8FD0\u52A8\u89C4\u5212\uFF09`;oe.animatePoseDelta({dx:Ge,dy:at,dz:0,label:qe}),I(qe),O.current!==null&&globalThis.clearTimeout(O.current),O.current=globalThis.setTimeout(()=>{I(null),O.current=null},2600)}}D.current=Ce?{candidateId:P.identity.candidateId,center:[Ce[0],Ce[1]]}:null},[P]),Nn(()=>()=>{O.current!==null&&globalThis.clearTimeout(O.current)},[]);let De=Os(oe=>{C.current?.setCamera(oe)},[]),Re=Os(oe=>{let Ce=Hu(P?.report??null,oe);T(Ce),Ce.length>0&&C.current?.focusObjects(Ce)},[P?.report]),mt=Os(oe=>{R(Ce=>{let Le={...Ce,[oe]:!Ce[oe]};return C.current?.setVisibility(Le),Le})},[]),[nt,lt]=ni(null),K=Os(async oe=>{let Ce=l.run,Le=l.selectedVersion;if(!Ce||!Le)return;let Ge=P?.report??Le.report,at=Ge!==null&&Ge.overall!=="PASS";if(!(at&&!globalThis.confirm(`\u5019\u9009 ${Le.candidateId} \u672A\u901A\u8FC7\uFF08overall=${Ge?.overall}\uFF09\u3002\u5931\u8D25\u7248\u672C\u53EA\u80FD\u7528\u4E8E\u8BCA\u65AD\uFF1B\u4E0B\u8F7D\u6587\u4EF6\u540D\u4F1A\u5E26 FAILED- \u524D\u7F00\u3002\u4ECD\u8981\u4E0B\u8F7D\u5417\uFF1F`))){lt(oe.artifactId);try{let N=await o.readArtifact(oe,{confirmedFailure:at});if(!N)return;let qe=`${at?"FAILED-":""}${Ce.runId}-${Le.candidateId}-${oe.name}`,A=oe.mime??ix(oe.name),_=new Blob([N.bytes],{type:A}),B=globalThis.URL.createObjectURL(_),W=document.createElement("a");W.href=B,W.download=qe,document.body.appendChild(W),W.click(),W.remove(),globalThis.setTimeout(()=>globalThis.URL.revokeObjectURL(B),1e4)}finally{lt(null)}}},[o,P?.report,l.run,l.selectedVersion]),te=Os((oe,Ce)=>{let Le=l.run,Ge=l.selectedVersion;if(!Le||!Ge)return;let at=Ce?"FAILED-":"",N=JSON.stringify(oe.raw,null,2),ft=new Blob([N],{type:"application/json"}),qe=globalThis.URL.createObjectURL(ft),A=document.createElement("a");A.href=qe,A.download=`${at}${Le.runId}-${Ge.candidateId}-report-response-copy.json`,document.body.appendChild(A),A.click(),A.remove(),globalThis.setTimeout(()=>globalThis.URL.revokeObjectURL(qe),1e4)},[l.run,l.selectedVersion]),be=Os(()=>{let oe=l.baselineScene?.report,Ce=l.compareBaselineId,Le=l.run;if(!oe||!Ce||!Le)return;let Ge=JSON.stringify(oe.raw,null,2),at=new Blob([Ge],{type:"application/json"}),N=globalThis.URL.createObjectURL(at),ft=document.createElement("a");ft.href=N,ft.download=`BASELINE-${Le.runId}-${Ce}-report-response-copy.json`,document.body.appendChild(ft),ft.click(),ft.remove(),globalThis.setTimeout(()=>globalThis.URL.revokeObjectURL(N),1e4)},[l.baselineScene,l.compareBaselineId,l.run]),ze=tx[l.phase]?.(l)??l.phase,ce=l.run,Ye=P?.task??ce?.task??null,Mt=P?.report??l.selectedVersion?.report??null,Ze=y===!1||u.busy||["sending","awaiting-draft","draft","confirming","awaiting-commit"].includes(u.phase),it=!ce||Ze,gt=d?"collapsed":p?"focused":it?"input":"balanced",Qe=P?.reportFreshness.state==="current"&&Gs(Mt?.raw,{candidateId:l.selectedVersion?.candidateId??null,taskRevision:ce?.taskRevision??null,stepSha256:l.selectedVersion?.stepSha256??null,reportId:l.selectedVersion?.report?.reportId??null}).accepted;return ie("section",{className:`fitplate-panel fp-theme-${r}`,"data-fitplate":"panel","data-phase":l.phase,"data-session":s??"","data-build-hash":Un.buildHash,"data-run-stage":l.run!==null?"true":"false","data-layout":gt,"data-input-active":it?"true":"false",children:[ie("header",{className:"fp-header",children:[ie("div",{className:"fp-title",children:[ie("strong",{children:["FitPlate ",Y("span",{className:"fp-brand-cn",children:"\u88C5\u5F97\u4E0A"})]}),Y("span",{className:"fp-muted",title:ce?`\u8FD0\u884C ${ce.runId}`:void 0,children:ce?`\u5019\u9009 ${l.selectedCandidateId??"\u672A\u9009\u62E9"} \xB7 \u4EFB\u52A1\u4FEE\u8BA2 ${ce.taskRevision??"\u672A\u77E5"}`:"FDM \u4F20\u611F\u5668\u5B89\u88C5\u677F \xB7 \u88C5\u914D\u68C0\u67E5"})]}),ie("div",{className:"fp-header-actions",children:[Y("span",{className:"fp-phase","data-fitplate":"phase",children:ce?{COMPLETED:"\u672C\u8F6E\u5DF2\u7ED3\u675F",RUNNING:"\u8BBE\u8BA1\u8FDB\u884C\u4E2D",FAILED:"\u672C\u8F6E\u672A\u901A\u8FC7",BLOCKED:"\u9700\u8981\u5904\u7406"}[ce.state]??"\u6B63\u5728\u5904\u7406":"\u4ECE\u4E0B\u65B9\u5F00\u59CB"}),Y("button",{type:"button","data-fitplate":"workbench-focus","aria-pressed":p&&!d,onClick:()=>{h(!1),m(oe=>!oe)},children:p&&!d?"\u6062\u590D\u5206\u5C4F":"\u653E\u5927\u9762\u677F"}),Y("button",{type:"button","data-fitplate":"workbench-toggle","aria-expanded":!d,"aria-controls":f,onClick:()=>h(oe=>!oe),children:d?"\u5C55\u5F00\u9762\u677F":"\u6536\u8D77\u9762\u677F"}),ce&&!Ze?Y(bl,{controller:c,sessionKey:s,disabled:!s,hasRun:!0,compact:!0,collapsedOverride:!0,onCollapsedChange:g}):null,Y("button",{type:"button",onClick:()=>{o.refresh({manual:!0,forceScene:!0})},children:"\u5237\u65B0"}),ie("details",{className:"fp-refresh-settings",children:[Y("summary",{children:"\u5237\u65B0\u8BBE\u7F6E"}),ie("label",{className:"fp-toggle",children:[Y("input",{type:"checkbox",checked:l.autoRefresh,onChange:oe=>o.setAutoRefresh(oe.target.checked)}),"\u81EA\u52A8\u5237\u65B0\uFF081s\uFF0C\u7EC8\u6001\u505C\u6B62\uFF09"]}),l.lastUpdatedAt?ie("span",{className:"fp-muted",children:["\u66F4\u65B0 ",new Date(l.lastUpdatedAt).toLocaleTimeString()]}):null]})]})]}),l.notice?.kind==="error"?ie("p",{className:"fp-alert fp-alert-error",role:"alert","data-fitplate":"notice",children:[l.notice.title,l.notice.detail?ie("span",{className:"fp-detail",children:["\uFF08",l.notice.detail,"\uFF09"]}):null]}):null,l.sceneError||l.downloadError?ie("p",{className:"fp-alert fp-alert-error",role:"alert","data-fitplate":"visible-workbench-error",children:[l.sceneError?.title??l.downloadError?.title,(l.sceneError?.detail??l.downloadError?.detail)||""]}):null,it?Y(bl,{controller:c,sessionKey:s,disabled:!s,hasRun:l.run!==null,collapsedOverride:y,onCollapsedChange:g}):null,!it&&!d?Y("p",{className:"fp-run-guidance",role:"status",children:ce?.state==="COMPLETED"?"\u5148\u770B\u53F3\u4FA7\u7ED3\u8BBA\u548C\u4E0B\u8F7D\uFF1B\u8981\u770B AI \u5982\u4F55\u4FEE\u6B63\uFF0C\u5C55\u5F00\u4E0B\u65B9\u300C\u7248\u672C\u4E0E\u64CD\u4F5C\u8BB0\u5F55\u300D\u3002":"AI \u6B63\u5728\u8BBE\u8BA1\u6216\u5904\u7406\u68C0\u67E5\u7ED3\u679C\u3002\u4E0A\u65B9\u804A\u5929\u663E\u793A\u5B9E\u9645\u8FDB\u5EA6\uFF1B\u82E5\u51FA\u73B0\u6743\u9650\u5361\uFF0C\u8BF7\u6838\u5BF9\u540E\u5141\u8BB8\u4E00\u6B21\u3002"}):null,ie("div",{className:"fp-grid",id:f,children:[Y(rx,{containerRef:M,viewerNotice:S,scene:P,visibility:v,onToggleVisibility:mt,onCamera:De,onResetCamera:()=>C.current?.resetCamera(),animationLabel:w,report:Mt,currentHighlight:b.length>0?b:X,compareLegend:l.compareBaselineId&&l.selectedCandidateId&&l.compareBaselineId!==l.selectedCandidateId?{baselineId:l.compareBaselineId,currentId:l.selectedCandidateId,referenceAvailable:!!l.baselineScene?.mesh,referenceOn:k&&!!l.baselineScene?.mesh}:null,onToggleReference:V}),Y(ax,{accepted:Qe,delivery:ce&&l.selectedVersion?Y(Iu,{run:ce,version:l.selectedVersion,report:Mt,freshness:P?.reportFreshness??null,change:l.poseChangeText,busy:nt!==null,onDownload:K}):null,report:Mt,freshness:P?.reportFreshness??null,source:P?.reportSource??"none",pairs:Z,onFocus:Re}),ie("div",{className:"fp-secondary","data-fitplate":"secondary-regions",children:[ie("details",{className:"fp-secondary-disclosure","data-fitplate":"task-disclosure",children:[ie("summary",{children:["\u4EFB\u52A1\u4E0E\u51BB\u7ED3\u7EA6\u675F",ce?` \xB7 \u4FEE\u8BA2 ${ce.taskRevision??"\u672A\u77E5"}`:""]}),Y(sx,{task:Ye,run:ce,snapshot:l,sceneProvenance:ne})]},`task-${s}`),ie("details",{className:"fp-secondary-disclosure","data-fitplate":"versions-disclosure",children:[ie("summary",{children:["\u7248\u672C\u4E0E\u64CD\u4F5C\u8BB0\u5F55 \xB7 ",l.versions.length," \u4E2A\u5019\u9009",l.versions.some(oe=>oe.report&&oe.report.overall!=="PASS")?Y("span",{className:"fp-warn",children:"\uFF08\u542B\u672A\u901A\u8FC7\u7248\u672C\uFF09"}):null]}),Y(ox,{snapshot:l,sceneFreshness:P?.reportFreshness??null,compareView:re,onSetBaseline:oe=>o.setCompareBaseline(oe),onDownloadBaselineReport:be,onSelect:oe=>o.selectCandidate(oe),onDownload:K,onDownloadReportCopy:te,downloadBusy:nt})]},`versions-${s}`)]})]})]})}}function ix(n){let e=n.toLowerCase();return e.endsWith(".step")||e.endsWith(".stp")?"model/step":e.endsWith(".stl")?"model/stl":e.endsWith(".json")?"application/json":"application/octet-stream"}function sx({task:n,run:e,snapshot:t,sceneProvenance:i}){if(!n)return ie("section",{className:"fp-region fp-region-task","data-fitplate":"task-region",children:[Y("h2",{children:"\u4EFB\u52A1\u4E0E\u7EA6\u675F"}),ie("p",{className:"fp-empty",children:["\u5C1A\u672A\u8BFB\u53D6\u5230\u51BB\u7ED3\u4EFB\u52A1\u3002",t.phase==="empty"?"\u5F53\u524D\u4F1A\u8BDD\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u8FD0\u884C\u3002":""]}),t.notice&&t.notice.kind!=="error"?Y("p",{className:"fp-muted",children:t.notice.title}):null]});let s=n.plate,r=n.baseHoles,a=n.sensor,o=n.requirements,l=n.tolerances,c=Wu(n.provenance??i);return ie("section",{className:"fp-region fp-region-task","data-fitplate":"task-region",children:[Y("h2",{children:"\u4EFB\u52A1\u4E0E\u7EA6\u675F"}),n.requestText?ie("p",{className:"fp-request","data-fitplate":"task-request",children:["\u201C",n.requestText,"\u201D"]}):null,ie("dl",{className:"fp-facts",children:[Y("dt",{children:"\u4EFB\u52A1"}),ie("dd",{children:[n.taskId??"\u672A\u77E5"," \xB7 revision ",n.revision??"\u672A\u77E5",e?.taskRevision!=null&&n.revision!==null&&n.revision!==e.taskRevision?ie("span",{className:"fp-warn",children:["\uFF08\u8FD0\u884C\u6E05\u5355\u5F53\u524D revision ",e.taskRevision,"\uFF09"]}):null]}),Y("dt",{children:"\u51BB\u7ED3\u5C3A\u5BF8"}),Y("dd",{children:s&&s.locked.length>0?s.locked.map(u=>`${u}=${Ae(u==="width"?s.width:u==="height"?s.height:s.thickness)}`).join(" \xB7 "):"\u65E0\uFF08\u5168\u90E8\u53EF\u6539\uFF09"}),s&&Object.keys(s.editable).length>0?ie(il,{children:[Y("dt",{children:"\u53EF\u6539\u8303\u56F4"}),Y("dd",{children:Object.entries(s.editable).map(([u,d])=>`${u} \u2208 [${Ae(d.min)}, ${Ae(d.max)}]`).join(" \xB7 ")})]}):null,Y("dt",{children:"\u5E95\u5EA7\u5B54\uFF08\u51BB\u7ED3\uFF09"}),ie("dd",{children:["\u2300",Ae(r?.diameter??null)," \xB7 ",r?.centers.length??0," \u4E2A",r&&r.centers.length>0?ie("span",{className:"fp-muted",children:[" ","[",r.centers.slice(0,6).map(u=>`(${u[0]},${u[1]})`).join(" "),r.centers.length>6?" \u2026":"","]"]}):null]}),Y("dt",{children:"\u8BBE\u5907"}),ie("dd",{children:[a?.modelId??"\u672A\u77E5"," \xB7 \u5916\u5F62 ",a?.bodySize?a.bodySize.join("\xD7"):"?"," mm \xB7 \u5B54 \u2300",Ae(a?.holeDiameter??null)," \xD7 ",a?.holeOffsets.length??"?"]}),Y("dt",{children:"\u5141\u8BB8\u4E2D\u5FC3\u57DF"}),ie("dd",{children:["x \u2208 [",Ae(a?.allowedCenterX?.min??null),", ",Ae(a?.allowedCenterX?.max??null),"] \xB7 y \u2208 [",Ae(a?.allowedCenterY?.min??null),", ",Ae(a?.allowedCenterY?.max??null),"] \xB7 \u65CB\u8F6C"," ",a?.allowedRotationDeg.join("/")??"0","\xB0"]}),Y("dt",{children:"\u8981\u6C42\u503C"}),ie("dd",{children:["\u81EA\u7531\u95F4\u9699 \u2265 ",Ae(o?.minimum_free_clearance??null),"mm \xB7 \u8FB9\u8DDD \u2265"," ",Ae(o?.minimum_edge_ligament??null),"mm \xB7 \u5B54\u95F4 \u2265"," ",Ae(o?.minimum_hole_ligament??null),"mm"]}),Y("dt",{children:"\u5BB9\u5DEE"}),ie("dd",{className:"fp-muted",children:["\u51E0\u4F55 \u03B5 ",Ae(l?.geometry_epsilon_mm??null),"mm \xB7 \u4EA4\u96C6\u4F53\u79EF \u03B5"," ",Ae(l?.interference_volume_epsilon_mm3??null),"mm\xB3 \xB7 \u5C3A\u5BF8 \xB1",Ae(l?.dimensional_tolerance_mm??null),"mm"]}),Y("dt",{children:"\u6570\u636E\u6E90"}),Y("dd",{className:c.warn?"fp-warn":"","data-fitplate":"task-source",title:c.hint??void 0,children:c.text})]}),t.phase==="empty"&&t.notice?Y("p",{className:"fp-muted",children:t.notice.title}):null]})}function rx({containerRef:n,viewerNotice:e,scene:t,visibility:i,onToggleVisibility:s,onCamera:r,onResetCamera:a,animationLabel:o,report:l,currentHighlight:c,compareLegend:u,onToggleReference:d}){let h=t?.pose??null,p=t?.envelopeNotes??[],m=t?.reportFreshness??null;return ie("section",{className:"fp-region fp-region-view","data-fitplate":"view-region",children:[ie("h2",{children:["\u4E09\u7EF4\u89C6\u56FE",Y("span",{className:"fp-muted",children:"\u771F\u5B9E CAD \u6A21\u578B\uFF08\u6765\u81EA STEP \u6587\u4EF6\uFF09"})]}),ie("div",{className:"fp-view-toolbar",children:[Y("button",{type:"button",onClick:()=>r("top"),children:"\u4FEF\u89C6"}),Y("button",{type:"button",onClick:()=>r("side"),children:"\u4FA7\u89C6"}),Y("button",{type:"button",onClick:()=>r("front"),children:"\u6B63\u89C6"}),Y("button",{type:"button",onClick:()=>r("iso"),children:"\u7B49\u8F74"}),Y("button",{type:"button",onClick:a,children:"\u91CD\u7F6E\u76F8\u673A"}),Y("span",{className:"fp-toolbar-sep"}),[["plate","\u677F"],["device","\u8BBE\u5907"],["connector","\u64CD\u4F5C\u7A7A\u95F4"],["environment","\u56FA\u5B9A\u73AF\u5883"]].map(([y,g])=>ie("label",{className:"fp-toggle",children:[Y("input",{type:"checkbox",checked:i[y],onChange:()=>s(y),"data-fitplate-toggle":y}),g]},y))]}),ie("div",{className:"fp-view-body",children:[Y("div",{className:"fp-canvas-host",ref:n,"data-fitplate":"canvas-host"}),t?null:Y("p",{className:"fp-empty fp-canvas-overlay",children:t===null?"\u5C1A\u672A\u8F7D\u5165\u5019\u9009\u7F51\u683C":null}),e?Y("p",{className:"fp-alert fp-alert-warn fp-canvas-overlay",role:"status",children:e}):null,t?.meshRejection?ie("p",{className:"fp-alert fp-alert-error fp-canvas-overlay",role:"alert","data-fitplate":"mesh-rejected",children:["\u7F51\u683C\u5DF2\u62D2\u7EDD\u6E32\u67D3\uFF1A",t.meshRejection.message,t.meshRejection.detail?`\uFF08${t.meshRejection.detail}\uFF09`:""]}):null,o?Y("p",{className:"fp-animation-label","data-fitplate":"animation-label",children:o}):null]}),ie("details",{className:"fp-view-info",children:[Y("summary",{children:"\u56FE\u4F8B\u4E0E\u6A21\u578B\u8BF4\u660E\uFF1A\u8BBE\u5907\u548C\u64CD\u4F5C\u7A7A\u95F4\u4E3A\u5305\u7EDC"}),ie("div",{className:"fp-legend","data-fitplate":"compare-legend",children:[u?ie(il,{children:[ie("span",{className:"fp-legend-item","data-compare-label":"current",children:[Y("i",{className:"fp-swatch fp-swatch-plate"}),"\u5F53\u524D ",u.currentId,"\uFF08STEP \u7F51\u683C\xB7\u5B9E\u8272\uFF09"]}),ie("span",{className:"fp-legend-item","data-compare-label":"baseline",children:[Y("i",{className:"fp-swatch fp-swatch-reference"}),"\u57FA\u51C6 ",u.baselineId,"\uFF08STEP \u7F51\u683C\xB7\u534A\u900F\u660E\uFF09",u.referenceAvailable?"":"\uFF1A\u7F51\u683C\u4E0D\u53EF\u7528\uFF0C\u4EC5\u6BD4\u5BF9\u62A5\u544A"]}),ie("label",{className:"fp-toggle",children:[Y("input",{type:"checkbox",checked:u.referenceOn,disabled:!u.referenceAvailable,onChange:y=>d(y.target.checked),"data-fitplate":"reference-toggle"}),"\u53E0\u52A0\u57FA\u51C6\u7F51\u683C"]})]}):null,ie("span",{className:"fp-legend-item",children:[Y("i",{className:"fp-swatch fp-swatch-plate"}),"\u677F\uFF08STEP \u5B9E\u6D4B\u7F51\u683C\uFF09"]}),ie("span",{className:"fp-legend-item",children:[Y("i",{className:"fp-swatch fp-swatch-device"}),"\u8BBE\u5907\u5305\u7EDC",h?.verified?"\uFF08\u5B9E\u6D4B\u4F4D\u59FF\uFF09":"\uFF08\u672A\u9A8C\u8BC1\uFF09"]}),ie("span",{className:"fp-legend-item",children:[Y("i",{className:"fp-swatch fp-swatch-connector"}),"\u8FDE\u63A5\u5668\u64CD\u4F5C\u7A7A\u95F4\uFF08\u4FDD\u5B88\u5305\u7EDC\uFF09"]}),ie("span",{className:"fp-legend-item",children:[Y("i",{className:"fp-swatch fp-swatch-fail"}),"\u5931\u8D25/\u672A\u786E\u5B9A\u5BF9\u8C61"]})]}),t?ie("ul",{className:"fp-view-notes","data-fitplate":"view-notes",children:[m&&m.state!=="current"&&l?ie("li",{className:"fp-warn","data-fitplate":"view-freshness",children:["\u62A5\u544A\u72B6\u6001\uFF1A",m.label,"\uFF1B\u6B64\u89C6\u56FE\u4E0D\u4EE3\u8868\u5F53\u524D\u8981\u6C42\u4E0B\u7684\u901A\u8FC7\u7ED3\u679C"]}):null,ie("li",{className:h?.verified?"":"fp-warn",children:["\u4F4D\u59FF\uFF1A",h?.note??"\u672A\u77E5"]}),ie("li",{children:["\u677F\u9876\u57FA\u51C6\uFF1A",t.plateThickness.thicknessMm===null?"\u7F3A\u5931":`${Ae(t.plateThickness.thicknessMm)}mm`,"\uFF08",t.plateThickness.source==="report_g02"?"G02 \u5B9E\u6D4B":t.plateThickness.source==="task_frozen"?"\u4EFB\u52A1\u51BB\u7ED3\u503C":"\u672A\u77E5","\uFF09"]}),t.mesh?ie("li",{children:["\u7F51\u683C\uFF1A",t.mesh.triangleCount," \u4E09\u89D2\u9762 \xB7 \u9876\u70B9 ",t.mesh.vertexCount," \xB7 STEP"," ",t.mesh.stepSha256.slice(0,12),"\u2026",t.mesh.toleranceMm!==null?` \xB7 \u7F51\u683C\u5BB9\u5DEE ${Ae(t.mesh.toleranceMm)}mm`:""]}):null,p.map(y=>Y("li",{className:"fp-warn",children:y},y)),ie("li",{className:"fp-muted",children:["\u64CD\u4F5C\u7A7A\u95F4\u662F\u4FDD\u5B88\u5305\u7EDC\uFF0C\u4EC5\u8868\u793A\u6240\u9700\u7A7A\u95F4\uFF1B\u672C\u9762\u677F\u4E0D\u58F0\u660E\u53EF\u6253\u5370\u5F3A\u5EA6\uFF0C\u4E5F\u4E0D\u505A\u65E0\u78B0\u649E\u8FD0\u52A8\u89C4\u5212\u3002\u5F53\u524D\u9AD8\u4EAE\uFF1A",c.length>0?c.join("\u3001"):"\u65E0",l&&l.overall!=="PASS"?"\uFF08\u5F53\u524D\u5019\u9009\u672A\u901A\u8FC7\uFF09":""]})]}):null]})]})}function ax({accepted:n,delivery:e,report:t,freshness:i,source:s,pairs:r,onFocus:a}){let o=ci(t);return ie("section",{className:"fp-region fp-region-checks","data-fitplate":"checks-region",children:[e,ie("details",{className:"fp-checks-disclosure","data-fitplate":"checks-disclosure",children:[ie("summary",{children:["\u68C0\u67E5\u660E\u7EC6 G01\u2013G08",t&&i?.state==="current"&&(t.overall!=="PASS"||n)?Y(nl,{status:t.overall}):Y("span",{className:"fp-badge fp-badge-unknown",children:t?"\u8BC1\u636E\u5F85\u6838\u5B9E":"\u65E0\u62A5\u544A"}),t&&t.overall!=="PASS"?Y("span",{className:"fp-warn",children:"\uFF08\u542B\u672A\u901A\u8FC7\u9879\uFF09"}):null]}),ie("h2",{children:["\u9A8C\u8BC1\u6E05\u5355 G01\u2013G08",t&&i?.state==="current"&&(t.overall!=="PASS"||n)?Y(nl,{status:t.overall}):Y("span",{className:"fp-badge fp-badge-unknown",children:t?"\u901A\u8FC7\u8BC1\u636E\u5F85\u6838\u5B9E":"\u65E0\u62A5\u544A"}),t&&i&&Kd[i.state]?Y("span",{className:"fp-badge fp-badge-warn",title:i.label,children:Kd[i.state]}):null]}),t?ie("p",{className:"fp-muted","data-fitplate":"report-meta",children:["\u62A5\u544A ",t.reportId," \xB7 \u9A8C\u8BC1\u5668 ",t.validatorVersion??"\u672A\u77E5"," \xB7"," ",t.createdAt?new Date(t.createdAt).toLocaleString():"\u65E0\u65F6\u95F4",s==="run-summary"?" \xB7 \u62A5\u544A\u6458\u8981\uFF08\u672A\u542B\u9010\u9879\u6570\u636E\uFF09":"",i?ie("span",{className:i.state==="current"?"fp-ok":"fp-warn",children:[" \xB7 ",i.label]}):null]}):Y("p",{className:"fp-empty",children:"\u5C1A\u65E0\u9A8C\u8BC1\u62A5\u544A\uFF1A\u672C\u5019\u9009\u8FD8\u6CA1\u6709\u7ECF\u72EC\u7ACB\u6D4B\u91CF\u9A8C\u6536\u3002"}),Y("ol",{className:"fp-checks",children:Fn.map((l,c)=>{let u=o[c],d=u?Il(u,{pairs:r}):[],h=u&&u.status!=="PASS"?Gu(u.reasonCode):null,p=u?Object.keys(u.measured).length:0,m=u?Object.keys(u.required).length:0,y=u!==null&&u.status!=="PASS"&&u.objects.length>0;return ie("li",{className:nx(u),"data-check":l,"data-status":u?.status??"MISSING",onClick:()=>a(l),role:"button",tabIndex:0,onKeyDown:g=>{(g.key==="Enter"||g.key===" ")&&a(l)},children:[ie("div",{className:"fp-check-head",children:[Y("b",{children:l}),Y("span",{children:Vu[l]}),u?Y(nl,{status:u.status}):Y("span",{className:"fp-badge fp-badge-missing",children:"\u672A\u5305\u542B"})]}),u?ie(il,{children:[d.length>0?Y(su,{lines:d}):Y("div",{className:"fp-note",children:"\u62A5\u544A\u672A\u9644\u5B9E\u6D4B\u6570\u636E\u3002"}),h?ie("div",{className:"fp-reason",children:["\u539F\u56E0\uFF1A",h.label]}):null,u.objects.length>0?ie("div",{className:"fp-objects",children:["\u5BF9\u8C61\uFF1A",u.objects.join("\u3001")]}):null,ie("details",{className:"fp-details",open:u.status==="FAIL",children:[ie("summary",{children:["\u8BE6\u7EC6\u6D4B\u91CF\u6570\u636E\uFF08",p," \u9879\u5B9E\u6D4B",m>0?` \xB7 ${m} \u9879\u8981\u6C42`:"","\uFF09"]}),ie("div",{className:"fp-details-body",children:[Y("h4",{children:"\u5B9E\u6D4B"}),Y(Jd,{values:u.measured,empty:"\u62A5\u544A\u672A\u9644\u5B9E\u6D4B\u503C"}),m>0?ie(il,{children:[Y("h4",{children:"\u8981\u6C42"}),Y(Jd,{values:u.required,empty:"\u62A5\u544A\u672A\u9644\u8981\u6C42\u503C"})]}):null,u.reasonCode?ie("p",{className:"fp-detail-line",children:["\u539F\u56E0\u4EE3\u7801\uFF1A",u.reasonCode]}):null,u.evidenceRef?ie("p",{className:"fp-detail-line",children:["\u8BC1\u636E\u5F15\u7528\uFF1A",u.evidenceRef]}):null,u.note?ie("p",{className:"fp-detail-line",children:["\u9A8C\u8BC1\u5668\u5907\u6CE8\uFF1A",u.note]}):null]})]})]}):Y("div",{className:"fp-note",children:"\u62A5\u544A\u672A\u5305\u542B\u8BE5\u68C0\u67E5\u9879\uFF0C\u4E0D\u80FD\u89C6\u4E3A\u901A\u8FC7\u3002"})]},l)})}),t&&t.errors.length>0?ie("div",{className:"fp-errors",children:[Y("h3",{children:"\u9A8C\u8BC1\u5668\u9519\u8BEF"}),Y("ul",{children:t.errors.map(l=>ie("li",{children:[Y("b",{children:l.code})," ",l.message]},`${l.code}-${l.message}`))})]}):null]},`${t?.reportId}-${i?.state}`)]})}function ox({snapshot:n,sceneFreshness:e,compareView:t,onSetBaseline:i,onDownloadBaselineReport:s,onSelect:r,onDownload:a,onDownloadReportCopy:o,downloadBusy:l}){let c=n.versions;return ie("section",{className:"fp-region fp-region-versions","data-fitplate":"versions-region",children:[ie("h2",{children:["\u7248\u672C\u4E0E\u64CD\u4F5C\u8BB0\u5F55",Y("span",{className:"fp-muted",children:"\u9009\u62E9\u7248\u672C\u5BF9\u6BD4\uFF1B\u4E0B\u8F7D\u5DF2\u767B\u8BB0\u4EA7\u7269"})]}),n.poseChangeText?Y("p",{className:"fp-change-summary","data-fitplate":"pose-change",children:n.poseChangeText}):null,n.compareBaselineId?Y(lx,{view:t,snapshot:n,onClear:()=>i(null),onDownloadBaselineReport:s}):null,c.length===0?Y("p",{className:"fp-empty",children:"\u5C1A\u65E0\u5019\u9009\u7248\u672C\u3002"}):Y("ol",{className:"fp-versions",children:c.map(u=>{let d=u.version.candidateId===n.selectedCandidateId,h=d?n.scene?.report??u.report:u.report,p=Gs(h?.raw,{candidateId:u.version.candidateId,taskRevision:n.run?.taskRevision??null,stepSha256:u.version.stepSha256,reportId:u.version.report?.reportId??null}).accepted,m=h!==null&&h.overall!=="PASS",y=d&&e?e:u.freshness;return ie("li",{className:`fp-version${d?" fp-version-selected":""}`,"data-candidate":u.version.candidateId,"data-selected":d?"true":"false",children:[ie("div",{className:"fp-version-head",children:[Y("button",{type:"button",onClick:()=>r(u.version.candidateId),disabled:d,children:u.version.candidateId}),h&&y.state==="current"&&(h.overall!=="PASS"||p)?Y(nl,{status:h.overall}):Y("span",{className:"fp-badge fp-badge-unknown",children:"\u672A\u9A8C\u8BC1"}),m?Y("span",{className:"fp-badge fp-badge-fail",children:"\u5931\u8D25\u7248"}):null,y.state==="stale-revision"?Y("span",{className:"fp-badge fp-badge-warn",children:"\u6309\u65E7\u8981\u6C42"}):null,y.state==="stale-binding"?Y("span",{className:"fp-badge fp-badge-warn",children:"\u62A5\u544A\u7ED1\u5B9A\u5931\u6548"}):null,n.compareBaselineId===u.version.candidateId?Y("span",{className:"fp-badge fp-badge-compare",children:"\u5BF9\u6BD4\u57FA\u51C6"}):null,Y("span",{className:"fp-muted",children:u.version.createdAt?new Date(u.version.createdAt).toLocaleString():""}),Y("button",{type:"button",className:"fp-compare-pick","data-compare-baseline":u.version.candidateId,disabled:d,title:d?"\u57FA\u51C6\u4E0E\u5F53\u524D\u4E0D\u80FD\u662F\u540C\u4E00\u7248\u672C":"\u628A\u8BE5\u7248\u672C\u8BBE\u4E3A\u5BF9\u6BD4\u57FA\u51C6\uFF08\u540C\u4E00\u8FD0\u884C\u5185\uFF09",onClick:()=>i(n.compareBaselineId===u.version.candidateId?null:u.version.candidateId),children:n.compareBaselineId===u.version.candidateId?"\u53D6\u6D88\u57FA\u51C6":"\u8BBE\u4E3A\u5BF9\u6BD4\u57FA\u51C6"})]}),ie("div",{className:"fp-version-meta",children:["STEP ",u.version.stepSha256?`${u.version.stepSha256.slice(0,12)}\u2026`:"\u672A\u77E5\u54C8\u5E0C",u.version.parentCandidateId?` \xB7 \u57FA\u4E8E ${u.version.parentCandidateId}`:"",y.state!=="current"?` \xB7 ${y.label}`:"",!d&&u.freshness.state==="unverified-metadata"?" \xB7 \u6458\u8981\uFF1A\u9009\u62E9\u8BE5\u7248\u672C\u540E\u8BFB\u53D6\u5B8C\u6574\u62A5\u544A":""]}),u.changeLines.length>0?Y("ul",{className:"fp-change",children:u.changeLines.map(g=>Y("li",{children:g},g))}):Y("div",{className:"fp-muted",children:"\u65E0\u6539\u52A8\u6458\u8981\uFF08\u672C\u7248\u53EF\u80FD\u4E3A\u9996\u7248\uFF09"}),d?ie("div",{className:"fp-artifacts",children:[Y("span",{className:"fp-muted",children:"\u4E0B\u8F7D\uFF1A"}),u.version.artifacts.length===0?Y("span",{className:"fp-muted",children:"\u8BE5\u8FD0\u884C\u672A\u767B\u8BB0\u53EF\u4E0B\u8F7D\u4EA7\u7269"}):u.version.artifacts.map(g=>ie("button",{type:"button",className:m?"fp-download fp-download-failing":"fp-download",onClick:()=>a(g),disabled:l!==null,"data-artifact":g.artifactId,children:[g.kind.toUpperCase()," ",g.name,g.bytes!==null?` (${Math.round(g.bytes/1024)}KiB)`:"",m?" \xB7 \u672A\u901A\u8FC7":""]},g.artifactId)),h?Y("button",{type:"button",className:m?"fp-download fp-download-failing":"fp-download",onClick:()=>o(h,m),"data-artifact":"report-response-copy",title:"\u4E0B\u8F7D\u672C\u6B21 scene \u54CD\u5E94\u4E2D\u7684\u62A5\u544A\u526F\u672C\uFF1B\u5DF2\u767B\u8BB0\u7684\u62A5\u544A\u4EA7\u7269\u8BF7\u4F18\u5148\u7528\u4E0A\u9762\u7684\u6309\u94AE",children:"\u62A5\u544A JSON\uFF08\u672C\u6B21\u54CD\u5E94\u526F\u672C\uFF09"}):null]}):null]},u.version.candidateId)})}),n.download?ie("p",{className:"fp-muted","data-fitplate":"download-progress",children:["\u6B63\u5728\u8BFB\u53D6 ",n.download.artifactId,"\uFF1A",Math.round(n.download.received/1024),"KiB",n.download.total!==null?` / ${Math.round(n.download.total/1024)}KiB`:""]}):null,n.downloadError?ie("p",{className:"fp-alert fp-alert-warn",role:"alert","data-fitplate":"download-error",children:[n.downloadError.title,n.downloadError.detail?ie("span",{className:"fp-detail",children:["\uFF08",n.downloadError.detail,"\uFF09"]}):null]}):null,n.sceneError?ie("p",{className:"fp-alert fp-alert-error",role:"alert","data-fitplate":"scene-error",children:[n.sceneError.title,n.sceneError.detail?ie("span",{className:"fp-detail",children:["\uFF08",n.sceneError.detail,"\uFF09"]}):null]}):null,Y("footer",{className:"fp-footer",children:ie("details",{className:"fp-tech","data-fitplate":"tech-details",children:[Y("summary",{children:"\u6280\u672F\u8BE6\u60C5\uFF08\u6784\u5EFA\u4FE1\u606F\u4E0E\u6570\u636E\u901A\u9053\uFF09"}),ie("div",{className:"fp-tech-body",children:[Y("p",{title:Un.buildHash,children:mu()}),Y("p",{children:"\u6570\u636E\u7ECF\u5BBF\u4E3B\u670D\u52A1\u8BFB\u53D6\uFF08fitplate.run / fitplate.scene / fitplate.artifact\uFF09\uFF0C\u9762\u677F\u4E0D\u6CE8\u5165\u5BBF\u4E3B DOM\u3002"}),Y("p",{children:"\u8FD0\u884C\u8F68\u8FF9\u8BF7\u5728 AGH \u5BBF\u4E3B\u754C\u9762\u67E5\u770B\u3002"})]})]})})]})}var jd={single:{label:"\u672A\u9009\u57FA\u51C6",className:"fp-badge fp-badge-unknown"},ready:{label:"\u540C\u8FD0\u884C\xB7\u5DF2\u6838\u9A8C\u5BF9\u6BD4",className:"fp-badge fp-badge-pass"},unverified:{label:"\u672A\u9A8C\u8BC1\u5BF9\u6BD4",className:"fp-badge fp-badge-warn"}};function lx({view:n,snapshot:e,onClear:t,onDownloadBaselineReport:i}){let s=a=>{if(!a||!a.report)return[];let o=ci(a.report)[Fn.indexOf("G06")];return o?Il(o,{pairs:a.pairs}):[]},r=n.baseline;return ie("div",{className:"fp-compare","data-fitplate":"compare-block","data-compare-status":n.status,children:[ie("div",{className:"fp-compare-head",children:[Y("b",{children:"\u7248\u672C\u5BF9\u6BD4"}),Y("span",{className:jd[n.status].className,children:jd[n.status].label}),ie("span",{className:"fp-muted","data-compare-labels":!0,children:["\u57FA\u51C6 ",r?.candidateId??"\u2014",r?`\uFF08${r.freshness.label}\uFF09`:""," \u2192 \u5F53\u524D ",n.current.candidateId,"\uFF08",n.current.freshness.label,"\uFF09"]}),Y("button",{type:"button",onClick:t,"data-fitplate":"compare-clear",children:"\u6E05\u9664\u5BF9\u6BD4"})]}),e.baselineBusy?Y("p",{className:"fp-muted",children:"\u6B63\u5728\u8BFB\u53D6\u57FA\u51C6\u7248\u672C\u7684\u573A\u666F\uFF08\u771F\u5B9E STEP \u7F51\u683C\u4E0E\u62A5\u544A\uFF09\u2026"}):null,e.baselineNotice?ie("p",{className:"fp-alert fp-alert-warn",role:"status","data-fitplate":"compare-notice",children:[e.baselineNotice.title,e.baselineNotice.detail?ie("span",{className:"fp-detail",children:["\uFF08",e.baselineNotice.detail,"\uFF09"]}):null]}):null,n.notes.map(a=>Y("p",{className:"fp-detail-line fp-warn","data-compare-note":!0,children:a},a)),e.comparePoseText?Y("p",{className:"fp-change-summary","data-fitplate":"compare-pose",children:e.comparePoseText}):null,Y("h3",{children:"\u53D8\u52A8\uFF08\u6765\u81EA\u4E24\u4EFD\u8BBE\u8BA1\u6587\u6863\uFF09"}),n.designLines.length>0?Y("ul",{className:"fp-change","data-fitplate":"compare-design",children:n.designLines.map(a=>Y("li",{children:a},a))}):Y("div",{className:"fp-muted",children:"\u4E24\u4EFD\u8BBE\u8BA1\u5728\u53EF\u6BD4\u5B57\u6BB5\u4E0A\u6CA1\u6709\u5DEE\u5F02\uFF0C\u6216\u8BBE\u8BA1\u6587\u6863\u7F3A\u5931\uFF08\u89C1\u4E0A\u65B9\u8BF4\u660E\uFF09\u3002"}),Y("h3",{children:"\u677F\u5C3A\u5BF8\uFF08\u5404\u81EA\u62A5\u544A\u7684 G02 \u5B9E\u6D4B\uFF09"}),ie("table",{className:"fp-compare-table",children:[Y("thead",{children:ie("tr",{children:[Y("th",{children:"\u5C3A\u5BF8"}),ie("th",{children:["\u57FA\u51C6 ",r?.candidateId??"\u2014"]}),ie("th",{children:["\u5F53\u524D ",n.current.candidateId]})]})}),Y("tbody",{children:n.plateRows.length===0?Y("tr",{children:Y("td",{colSpan:3,className:"fp-muted",children:"\u4E24\u4FA7\u90FD\u8FD8\u6CA1\u6709\u62A5\u544A\u5B9E\u6D4B\u503C\u3002"})}):n.plateRows.map(a=>ie("tr",{children:[Y("td",{children:a.label}),Y("td",{children:a.baselineMm===null?"\u672A\u6D4B\u91CF":`${Ae(a.baselineMm)} mm`}),Y("td",{children:a.currentMm===null?"\u672A\u6D4B\u91CF":`${Ae(a.currentMm)} mm`})]},a.axis))})]}),Y("h3",{children:"\u68C0\u67E5\u9879\u53D8\u5316\uFF08\u9010\u9879\u72B6\u6001\uFF0C\u975E\u88F8 overall \u5B57\u7B26\u4E32\uFF09"}),Y("div",{className:"fp-compare-checks",children:n.checkRows.map(a=>ie("span",{className:`fp-compare-check${a.changed?" fp-compare-check-changed":""}`,"data-check":a.id,children:[Y("b",{children:a.id})," ",a.baseline," \u2192 ",a.current]},a.id))}),Y("h3",{children:"\u5931\u8D25\u5BF9\u8C61\u53D8\u5316\uFF08\u6765\u81EA\u4E24\u4EFD\u62A5\u544A\u7684\u5BF9\u8C61\u6E05\u5355\uFF09"}),ie("div",{className:"fp-compare-failing",children:[ie("span",{"data-compare-gained":!0,children:["\u65B0\u589E\u5931\u8D25\uFF1A",n.failingGained.length>0?n.failingGained.join("\u3001"):"\u65E0"]}),ie("span",{"data-compare-resolved":!0,children:["\u5DF2\u6D88\u9664\u5931\u8D25\uFF1A",n.failingResolved.length>0?n.failingResolved.join("\u3001"):"\u65E0"]})]}),Y("h3",{children:"G06 \u5173\u952E\u5B9E\u6D4B\uFF08\u5404\u7248\u672C\u81EA\u8EAB\u62A5\u544A\u7684\u6838\u5BF9\u7ED3\u679C\uFF09"}),ie("div",{className:"fp-compare-g06",children:[ie("div",{"data-compare-g06":"baseline",children:[ie("b",{className:"fp-muted",children:["\u57FA\u51C6 ",r?.candidateId??"\u2014"]}),s(r).length>0?Y(su,{lines:s(r)}):Y("div",{className:"fp-muted",children:"\u672A\u6D4B\u91CF\uFF08\u65E0\u62A5\u544A\u6216 G06 \u7F3A\u5931\uFF09"})]}),ie("div",{"data-compare-g06":"current",children:[ie("b",{className:"fp-muted",children:["\u5F53\u524D ",n.current.candidateId]}),s(n.current).length>0?Y(su,{lines:s(n.current)}):Y("div",{className:"fp-muted",children:"\u672A\u6D4B\u91CF\uFF08\u65E0\u62A5\u544A\u6216 G06 \u7F3A\u5931\uFF09"})]})]}),e.baselineScene?.report?Y("div",{className:"fp-artifacts",children:Y("button",{type:"button",className:"fp-download",onClick:i,"data-artifact":"baseline-report-response-copy",title:"\u4E0B\u8F7D\u57FA\u51C6\u7248\u672C scene \u54CD\u5E94\u4E2D\u7684\u62A5\u544A\u526F\u672C\uFF08\u5E26 BASELINE- \u524D\u7F00\uFF1B\u4E0D\u662F\u5F53\u524D\u7248\u672C\u7684\u62A5\u544A\uFF09",children:"\u57FA\u51C6\u62A5\u544A JSON\uFF08\u672C\u6B21\u54CD\u5E94\u526F\u672C\uFF09"})}):null]})}function zM(n,e){let t=Qd(n);n.slots.register("workbench.panel",t,{id:"fitplate-workbench-panel",priority:0,...e?.publicConfig?.label?{label:String(e.publicConfig.label)}:{}})}export{zM as apply};
