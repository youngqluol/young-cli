# young-cli
A cli tool to easily create vue project using webpack5 to build.


## 一、feature

#### 1. vue3 + vue-router4 + vuex4 + webpack5

#### 2. rem适配
#### 3. 包分析
```js
npm run build --report
```
#### 4. 生成zip包
```js
npm run build --zip
```
#### 5. eslint代码检查

#### 6. husky + lint-staged: 提交校验、格式化
#### 7. GitHub Actions 自动化部署

## 二、start

```js
npm i young-cli-base -g
// 或
yarn global add young-cli-base
```

创建项目

```js
young create [项目名称]
```

在项目中添加插件

```js
young add [插件名]
```

## 三、插件
1. young-cli-plugin-babel
2. young-cli-plugin-eslint
3. young-cli-plugin-router
4. young-cli-plugin-vuex