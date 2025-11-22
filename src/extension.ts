import * as vscode from 'vscode';
import { findCompilers } from './compilerHandler';

// Переменная для кнопки в Status Bar
let statusBarItem: vscode.StatusBarItem;

/**
 * Функция активации расширения
 */
export function activate(context: vscode.ExtensionContext): void {
	console.log('C to ASM extension активировано!');

	// Регистрируем команду компиляции
	const compileCommand = vscode.commands.registerCommand('extension.compileToAsm', async () => {
		// Ищем доступные компиляторы
		const compilers = await findCompilers();

		// Если компиляторы не найдены — показываем ошибку
		if (compilers.length === 0) {
			vscode.window.showErrorMessage('Компиляторы не найдены! Установите GCC или Clang');
			return;
		}

		// Показываем список компиляторов для выбора
		const selected = await vscode.window.showQuickPick(compilers, {
			placeHolder: 'Выберите компилятор для сборки'
		});

		// Если пользователь выбрал компилятор
		if (selected) {
			vscode.window.showInformationMessage('Выбран: ' + selected);
		}
	});

	// Создаём кнопку в Status Bar справа
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '$(file-binary) To ASM';
	statusBarItem.command = 'extension.compileToAsm';
	statusBarItem.tooltip = 'Скомпилировать C/C++ в Assembly';
	statusBarItem.hide(); // Прячем по умолчанию

	// Проверяем текущий активный редактор при старте
	updateStatusBarVisibility(vscode.window.activeTextEditor);

	// Слушаем изменение активного редактора
	const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
		updateStatusBarVisibility(editor);
	});

	// Добавляем всё в подписки для правильной очистки
	context.subscriptions.push(compileCommand);
	context.subscriptions.push(statusBarItem);
	context.subscriptions.push(editorChangeListener);
}

/**
 * Показываем или прячем кнопку в зависимости от языка файла
 */
function updateStatusBarVisibility(editor: vscode.TextEditor | undefined): void {
	if (!editor) {
		statusBarItem.hide();
		return;
	}

	const languageId = editor.document.languageId;
	
	// Показываем кнопку только для C и C++
	if (languageId === 'c' || languageId === 'cpp') {
		statusBarItem.show();
	} else {
		statusBarItem.hide();
	}
}

/**
 * Функция деактивации расширения
 */
export function deactivate(): void {
	// Очистка ресурсов при деактивации
}

