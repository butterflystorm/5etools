class RenderObjects {
	static $getRenderedObject (obj) {
		const renderer = Renderer.get().setFirstSection(true);
		const renderStack = [];

		if (obj.entries) renderer.recursiveRender({entries: obj.entries}, renderStack, {depth: 2});
		if (obj.actionEntries) renderer.recursiveRender({entries: obj.actionEntries}, renderStack, {depth: 2});

		const hasToken = obj.tokenUrl || obj.hasToken;
		const extraThClasses = hasToken ? ["objs__name--token"] : null;

		return $$`
			${Renderer.utils.getBorderTr()}
			${Renderer.utils.getExcludedTr(obj, "object")}
			${Renderer.utils.getNameTr(obj, {extraThClasses, page: UrlUtil.PG_OBJECTS})}
			<tr class="text"><td colspan="6"><i>${obj.objectType !== "GEN" ? `${Parser.sizeAbvToFull(obj.size)} ${obj.creatureType ? Parser.monTypeToFullObj(obj.creatureType).asText : "物体"}` : `可变尺寸 物体`}</i><br></td></tr>
			<tr class="text"><td colspan="6">
				${obj.ac != null ? `<b>护甲等级：</b> ${obj.ac}<br>` : ""}
				<b>生命值：</b> ${obj.hp}<br>
				${obj.speed != null ? `<b>Speed:</b> ${Parser.getSpeedString(obj)}<br>` : ""}
				<b>伤害免疫：</b> ${Parser.getFullImmRes(obj.immune)}<br>
				${Parser.ABIL_ABVS.some(ab => obj[ab] != null) ? `<b>属性值:</b> ${Parser.ABIL_ABVS.filter(ab => obj[ab] != null).map(ab => renderer.render(`${ab.toUpperCase()} ${Renderer.utils.getAbilityRoller(obj, ab)}`)).join(", ")}` : ""}
				${obj.resist ? `<b>伤害抗性：</b> ${Parser.getFullImmRes(obj.resist)}<br>` : ""}
				${obj.vulnerable ? `<b>伤害易伤：</b> ${Parser.getFullImmRes(obj.vulnerable)}<br>` : ""}
				${obj.conditionImmune ? `<b>Condition Immunities:</b> ${Parser.getFullCondImm(obj.conditionImmune)}<br>` : ""}
			</td></tr>
			<tr class="text"><td colspan="6">${renderStack.join("")}</td></tr>
			${Renderer.utils.getPageTr(obj)}
			${Renderer.utils.getBorderTr()}`
	}
}
