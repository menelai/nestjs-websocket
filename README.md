## NestJS tools

## Декораторы

### @BodyArrayWithValidation(items: Type<any>, opts?: ValidationPipeOptions): ParameterDecorator
парсит и валидирует тело запроса, которе массив

### @ValidateWithCallback<T>(values: (object: T) => boolean, validationOptions?: ValidationOptions)
валидация поля объекта с использованием колбека. В колбек поступает объект целиком

### @Serialize(options: ClassSerializerContextOptions = {}): ClassDecorator & MethodDecorator
для сериализации ответов API — скрывать поля и т.п.

### @ApiUnauthorizedResponse(description = 'Пользователь не авторизован')
описывает информацию об ответе 401 для swagger

### @ApiNotFoundResponse(description = 'Запрашиваемый ресурс не найден')
описывает информацию об ответе 404 для swagger

### @BodyWithValidation(opts?: ValidationPipeOptions)
парсит и валидирует тело запроса

### @QueryWithValidation(opts?: ValidationPipeOptions)
парсит и валидирует гет-параметры

### TransformBoolean()
преобразует строковый boolean в обычный

## Функции

### sha256(input: string): string
создает sha256-хеш

### mergeDeep(...objects): any
производит глубокое слияние нескольких объектов

### escapeLikeString(src: string): string
экранирует % b _ для поиска в sql

### paginate

```typescript
paginate<T>(
  builder: SelectQueryBuilder<T>,
  pagination: PaginationOptions,
  callbackAfterCount?: () => void | Promise<void>,
): Promise<Pagination<T>>
```

Используется как обертка функции `paginate` модуля `nestjs-typeorm-paginate`.
* `T` — тип сущности TypeORM
* `builder` — запрос
* `pagination` — опции пагинации из модуля `nestjs-typeorm-paginate`
* `callbackAfterCount` — промежуточное действие после подсчета количества. Например, можно установить addOrderBy, не нужное в счете.

## Классы

### ApiPaginationResponse<T>
Базовый класс, описывающий ответ списка сущностей с пагинацией.

T — тип сущности

### ApiErrorResponse
описывает ответ сервера 4xx, 5xx

### ApiPaginationLinks
используется в `ApiPaginationResponse` для вывода ссылок

### ApiPaginationMeta
используется в `ApiPaginationResponse` для описания количества сущностей

### ApiPaginationQuery
описание и валидация query-строки запроса на выдачу сущностей с пагинацией

### PaginationOptions
описание и валидация query-строки запроса на выдачу сущностей с пагинацией

### TrimPipe
пайп, используемый для обрезки в `@BodyWithValidation()` и `@QueryWithValidation`.

Список необрезных полей можно указать в статическом поле `static readonly safeFields: string[]`.
По умолчанию туда включены поля `password`, `passwordConfirmation`.

[MIT](LICENSE)
