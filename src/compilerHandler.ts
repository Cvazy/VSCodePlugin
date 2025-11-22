import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

const execPromise = promisify(exec);

/**
 * Ищем установленные компиляторы в системе
 * @returns Массив путей к найденным компиляторам
 */
export async function findCompilers(): Promise<string[]> {
	const platform = process.platform;
	const compilers: string[] = [];

	// Определяем команду поиска в зависимости от ОС
	const searchCommand = platform === 'win32' ? 'where' : 'which';

	// Список компиляторов для поиска
	const compilersToFind = ['gcc', 'clang'];

	// Ищем каждый компилятор
	for (const compiler of compilersToFind) {
		try {
			const { stdout } = await execPromise(`${searchCommand} ${compiler}`);
			
			// Парсим вывод (может быть несколько строк)
			const paths = stdout
				.split('\n')
				.map(line => line.trim())
				.filter(line => line.length > 0);

			// Добавляем найденные пути
			compilers.push(...paths);
		} catch (error) {
			// Компилятор не найден — просто игнорируем
			// Не добавляем ничего в список
		}
	}

	// Убираем дубли и пустые строки
	const uniqueCompilers = [...new Set(compilers)].filter(path => path.length > 0);

	return uniqueCompilers;
}

/**
 * Компилируем C/C++ файл в Assembly
 * @param compilerPath Путь к компилятору
 * @param sourceFilePath Путь к исходному файлу
 * @returns Содержимое сгенерированного ASM файла
 */
export async function compileToAssembly(compilerPath: string, sourceFilePath: string): Promise<string> {
	// Проверяем, что исходный файл существует и не пустой
	try {
		const stats = await fs.stat(sourceFilePath);
		if (stats.size === 0) {
			throw new Error('Исходный файл пустой! Добавьте код в файл.');
		}
	} catch (error) {
		throw new Error(`Не удалось прочитать файл: ${sourceFilePath}`);
	}

	// Генерируем путь к временному выходному файлу
	const outputPath = path.join(os.tmpdir(), `output_${Date.now()}.s`);

	// Формируем команду компиляции с нужными флагами
	// -O0 - отключаем оптимизацию, чтобы видеть весь код
	// -S - только ассемблер, без линковки
	// -g - отладочная информация
	// -fverbose-asm - комментарии с именами переменных
	const command = `"${compilerPath}" -S -O0 -g -fverbose-asm -o "${outputPath}" "${sourceFilePath}"`;

	// Логируем команду для отладки
	console.log('Executing command:', command);

	try {
		// Выполняем компиляцию
		const { stderr, stdout } = await execPromise(command);

		// Логируем вывод
		if (stdout) {
			console.log('Compiler stdout:', stdout);
		}
		if (stderr) {
			console.log('Compiler stderr:', stderr);
		}

		// Если есть критические ошибки — бросаем исключение
		if (stderr && stderr.trim().length > 0) {
			// Некоторые компиляторы пишут warnings в stderr, но это не критично
			// Проверим, есть ли слово "error" в выводе
			if (stderr.toLowerCase().includes('error')) {
				throw new Error(`Ошибка компиляции:\n${stderr}`);
			}
		}

		// Проверяем, что выходной файл создан
		try {
			await fs.access(outputPath);
		} catch {
			throw new Error('Компилятор не создал выходной файл. Возможно, исходный код содержит ошибки.');
		}

		// Читаем содержимое сгенерированного ASM файла
		const asmContent = await fs.readFile(outputPath, 'utf-8');

		// Логируем размер результата
		console.log(`Generated ASM file size: ${asmContent.length} bytes`);

		// Удаляем временный файл, чтобы не мусорить
		try {
			await fs.unlink(outputPath);
		} catch (unlinkError) {
			// Если не удалось удалить — не критично, просто игнорируем
		}

		return asmContent;
	} catch (error) {
		// Пытаемся удалить временный файл даже при ошибке
		try {
			await fs.unlink(outputPath);
		} catch (unlinkError) {
			// Игнорируем ошибку удаления
		}

		// Пробрасываем ошибку дальше
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Неизвестная ошибка при компиляции');
	}
}

