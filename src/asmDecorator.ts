import * as vscode from 'vscode';

/**
 * Класс для маппинга и декорирования соответствий между C и ASM кодом
 */
export class AsmDecorator {
	// Карта: номер строки в C-файле -> массив номеров строк в ASM-файле
	private sourceToAsm: Map<number, number[]> = new Map();

	// Тип декорации для подсветки строк
	private decorationType: vscode.TextEditorDecorationType;

	constructor() {
		// Создаём стиль декорации для подсветки строк ASM
		this.decorationType = vscode.window.createTextEditorDecorationType({
			backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
			isWholeLine: true,
			borderWidth: '0 0 0 3px',
			borderStyle: 'solid',
			borderColor: new vscode.ThemeColor('editorInfo.foreground'),
			overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
			overviewRulerLane: vscode.OverviewRulerLane.Right
		});
	}

	/**
	 * Парсим ASM код и создаём карту соответствий
	 * @param asmLines Массив строк ASM кода
	 */
	public parseMapping(asmLines: string[]): void {
		this.sourceToAsm.clear();

		let currentSourceLine: number = -1;

		// Regex для парсинга .loc директив
		// Формат: .loc FILE_ID LINE_NUM [COL] [дополнительные флаги]
		const locRegex = /^\s*\.loc\s+\d+\s+(\d+)/;

		for (let i = 0; i < asmLines.length; i++) {
			const line = asmLines[i];
			const trimmed = line.trim();

			// Проверяем, это .loc директива?
			const locMatch = trimmed.match(locRegex);
			if (locMatch) {
				// Обновляем текущую строку исходника
				currentSourceLine = parseInt(locMatch[1], 10);
				// Саму строку .loc НЕ добавляем в маппинг
				continue;
			}

			// Пропускаем пустые строки
			if (trimmed.length === 0) {
				continue;
			}

			// Пропускаем метки (заканчиваются на :)
			if (trimmed.endsWith(':')) {
				continue;
			}

			// Пропускаем директивы (начинаются с .)
			if (trimmed.startsWith('.')) {
				continue;
			}

			// Пропускаем комментарии (начинаются с ; или //)
			if (trimmed.startsWith(';') || trimmed.startsWith('//')) {
				continue;
			}

			// Если это инструкция и у нас есть текущая строка исходника
			if (currentSourceLine > 0) {
				// Добавляем номер строки ASM в маппинг для этой строки C
				if (!this.sourceToAsm.has(currentSourceLine)) {
					this.sourceToAsm.set(currentSourceLine, []);
				}
				this.sourceToAsm.get(currentSourceLine)!.push(i);
			}
		}

		console.log('ASM Mapping created:', this.sourceToAsm);
	}

	/**
	 * Подсвечиваем строки ASM, соответствующие строке в C-коде
	 * @param editor Редактор с ASM кодом
	 * @param sourceLine Номер строки в C-файле (1-based)
	 */
	public decorate(editor: vscode.TextEditor, sourceLine: number): void {
		// Получаем массив строк ASM для этой строки C
		const asmLines = this.sourceToAsm.get(sourceLine);

		if (!asmLines || asmLines.length === 0) {
			// Нет соответствующих строк — убираем декорацию
			editor.setDecorations(this.decorationType, []);
			console.log(`No ASM lines found for C line ${sourceLine}`);
			return;
		}

		console.log(`Highlighting ASM lines for C line ${sourceLine}:`, asmLines);

		// Создаём массив диапазонов для декорации
		const ranges: vscode.Range[] = asmLines.map(asmLineIndex => {
			const line = editor.document.lineAt(asmLineIndex);
			return line.range;
		});

		// Применяем декорацию
		editor.setDecorations(this.decorationType, ranges);

		// Прокручиваем к первой найденной строке
		if (ranges.length > 0) {
			const firstRange = ranges[0];
			editor.revealRange(firstRange, vscode.TextEditorRevealType.InCenter);
		}
	}

	/**
	 * Очищаем декорацию в редакторе
	 * @param editor Редактор с ASM кодом
	 */
	public clear(editor: vscode.TextEditor): void {
		editor.setDecorations(this.decorationType, []);
	}

	/**
	 * Освобождаем ресурсы
	 */
	public dispose(): void {
		this.decorationType.dispose();
		this.sourceToAsm.clear();
	}

	/**
	 * Получить карту маппинга (для отладки)
	 */
	public getMapping(): Map<number, number[]> {
		return this.sourceToAsm;
	}
}

