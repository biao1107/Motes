"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  data() {
    return {
      challenges: [],
      loading: false,
      loadingMore: false,
      noMoreData: false,
      page: 1,
      pageSize: 10,
      total: 0,
      searchKeyword: "",
      statusFilter: null,
      // null表示全部状态
      statusIndex: 0,
      statusOptions: ["全部状态", "未开始", "进行中", "已结束"],
      hasMore: true,
      // 创建挑战弹窗相关
      showCreateModalFlag: false,
      submitting: false,
      minDate: "",
      groups: [],
      groupIndex: -1,
      createForm: {
        challengeType: "public",
        // 'public' 或 'group'
        challengeName: "",
        startDate: "",
        endDate: "",
        maxMembers: 10,
        trainRequire: "",
        coverImage: "",
        groupId: null
      },
      // 独立选择器相关
      showDatePicker: false,
      datePickerType: "",
      // 'startDate' 或 'endDate'
      datePickerValue: [0, 0, 0],
      // [yearIndex, monthIndex, dayIndex]
      years: [],
      months: [],
      days: [],
      // 索引变化追踪
      indexChangeLog: [],
      showGroupPicker: false,
      selectedGroupIndex: -1
    };
  },
  onLoad() {
    this.loadData();
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.refreshData();
  },
  methods: {
    // 加载挑战数据
    async loadData() {
      if (!common_auth.requireLogin())
        return;
      if (this.page === 1) {
        this.loading = true;
      } else {
        this.loadingMore = true;
      }
      try {
        const params = {};
        if (this.searchKeyword) {
          params.keyword = this.searchKeyword;
        }
        if (this.statusFilter !== null) {
          params.status = this.statusFilter;
        }
        const res = await common_api.apiChallengeList(params);
        const newChallenges = Array.isArray(res == null ? void 0 : res.data) ? res.data : res || [];
        this.challenges = newChallenges;
        this.total = newChallenges.length;
        this.hasMore = false;
        this.noMoreData = true;
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:382", "加载挑战列表失败:", e);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
        this.loadingMore = false;
      }
    },
    // 刷新数据
    refreshData() {
      this.page = 1;
      this.noMoreData = false;
      this.loadData();
    },
    // 加载更多数据
    loadMore() {
      if (this.loadingMore || this.noMoreData)
        return;
      common_vendor.index.showToast({
        title: "已加载全部数据",
        icon: "none"
      });
    },
    // 处理搜索
    handleSearch(e) {
      this.searchKeyword = e.detail.value;
      this.debounceSearch();
    },
    // 防抖搜索
    debounceSearch: function() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.page = 1;
        this.noMoreData = false;
        this.loadData();
      }, 500);
    },
    // 状态筛选变化
    onStatusChange(e) {
      this.statusIndex = parseInt(e.detail.value);
      this.statusFilter = this.statusIndex > 0 ? this.statusIndex - 1 : null;
      this.page = 1;
      this.noMoreData = false;
      this.loadData();
    },
    // 获取状态文本
    getStatusText(status, challenge) {
      if (challenge && challenge.startDate && challenge.endDate) {
        const calculatedStatus = this.calculateChallengeStatus(challenge);
        const statusMap = ["未开始", "进行中", "已结束"];
        return statusMap[calculatedStatus] || "未知";
      }
      if (typeof status === "number") {
        const statusMap = ["未开始", "进行中", "已结束"];
        return statusMap[status] || "未知";
      }
      return status || "未知";
    },
    // 获取挑战类型文本
    getTypeText(type, challenge) {
      const isGroupChallenge = challenge && challenge.groupId && challenge.groupId > 0;
      return isGroupChallenge ? "组内挑战" : "公开挑战";
    },
    // 获取挑战类型类名
    getTypeClass(type, challenge) {
      const isGroupChallenge = challenge && challenge.groupId && challenge.groupId > 0;
      return isGroupChallenge ? "type-group" : "type-public";
    },
    // 获取状态类名
    getStatusClass(status, challenge) {
      if (challenge && challenge.startDate && challenge.endDate) {
        const calculatedStatus = this.calculateChallengeStatus(challenge);
        const classes = ["status-pending", "status-active", "status-ended"];
        return classes[calculatedStatus] || "";
      }
      if (typeof status === "number") {
        const classes = ["status-pending", "status-active", "status-ended"];
        return classes[status] || "";
      }
      return "";
    },
    // 计算挑战状态
    calculateChallengeStatus(challenge) {
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(challenge.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(challenge.endDate);
      endDate.setHours(0, 0, 0, 0);
      if (today < startDate) {
        return 0;
      } else if (today >= startDate && today <= endDate) {
        return 1;
      } else {
        return 2;
      }
    },
    // 格式化日期
    formatDate(dateStr) {
      if (!dateStr)
        return "";
      try {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      } catch (e) {
        return dateStr;
      }
    },
    // 跳转到挑战详情页
    goToDetail(challengeId) {
      common_vendor.index.navigateTo({
        url: `/pages/challenge/detail?id=${challengeId}`
      });
    },
    // 选择挑战类型
    async selectChallengeType(type) {
      this.createForm.challengeType = type;
      if (type === "group" && this.groupIndex === -1) {
        await this.loadGroups();
      } else if (type === "public") {
        this.groupIndex = -1;
        this.createForm.groupId = null;
      }
    },
    // 显示创建挑战弹窗
    async showCreateModal() {
      if (!common_auth.requireLogin()) {
        common_vendor.index.showToast({
          title: "请先登录",
          icon: "none"
        });
        return;
      }
      const today = /* @__PURE__ */ new Date();
      this.minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      this.resetForm();
      await this.loadGroups();
      this.showCreateModalFlag = true;
    },
    // 隐藏创建挑战弹窗
    hideCreateModal() {
      this.showCreateModalFlag = false;
    },
    // 加载用户群组列表
    async loadGroups() {
      try {
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:571", "开始加载群组列表...");
        const res = await common_api.apiMyGroups();
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:573", "群组列表API响应:", res);
        if (res == null ? void 0 : res.data) {
          this.groups = Array.isArray(res.data) ? res.data : res || [];
        } else {
          this.groups = res || [];
        }
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:581", "加载后的群组数量:", this.groups.length);
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:582", "群组列表:", this.groups);
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:584", "加载群组列表失败:", e);
        common_vendor.index.showToast({
          title: "加载群组失败",
          icon: "none"
        });
      }
    },
    // 重置表单
    resetForm() {
      this.createForm = {
        challengeType: "public",
        // 默认为公开挑战
        challengeName: "",
        startDate: "",
        endDate: "",
        maxMembers: 10,
        trainRequire: "",
        coverImage: "",
        groupId: null
      };
      this.groupIndex = -1;
      this.selectedGroupIndex = -1;
      this.submitting = false;
    },
    // 开始日期选择
    onStartDateChange(e) {
      this.createForm.startDate = e.detail.value;
    },
    // 结束日期选择
    onEndDateChange(e) {
      this.createForm.endDate = e.detail.value;
    },
    // 打开开始日期选择器
    openStartDatePicker() {
      this.datePickerType = "startDate";
      this.setupDatePicker(this.createForm.startDate);
      this.showDatePicker = true;
    },
    // 打开结束日期选择器
    openEndDatePicker() {
      this.datePickerType = "endDate";
      this.setupDatePicker(this.createForm.endDate);
      this.showDatePicker = true;
    },
    // 设置日期选择器数据
    setupDatePicker(selectedDate) {
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:635", "=== 开始设置日期选择器 ===");
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:636", "传入选中日期:", selectedDate);
      const now = /* @__PURE__ */ new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:643", "当前实际时间:", {
        year: currentYear,
        month: currentMonth,
        day: currentDay,
        fullDate: now.toString()
      });
      this.years = [];
      for (let i = currentYear - 10; i <= currentYear + 5; i++) {
        this.years.push(i);
      }
      this.months = [];
      for (let i = 1; i <= 12; i++) {
        this.months.push(i);
      }
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:662", "年份数组:", this.years);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:663", "月份数组:", this.months);
      if (selectedDate && selectedDate !== "") {
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:667", "处理已选日期:", selectedDate);
        const dateParts = selectedDate.split("-");
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:673", "解析结果:", { year, month, day });
        const yearIndex = this.years.indexOf(year);
        const monthIndex = month - 1;
        const dayIndex = day - 1;
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:680", "索引计算:", { yearIndex, monthIndex, dayIndex });
        if (yearIndex === -1) {
          common_vendor.index.__f__("error", "at pages/challenge/index.vue:684", "年份不在范围内:", year);
          this.setDefaultDate(currentYear, currentMonth, currentDay);
          return;
        }
        if (monthIndex < 0 || monthIndex > 11) {
          common_vendor.index.__f__("error", "at pages/challenge/index.vue:691", "月份无效:", month);
          this.setDefaultDate(currentYear, currentMonth, currentDay);
          return;
        }
        this.datePickerValue = [yearIndex, monthIndex, 0];
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:698", "设置初始索引:", this.datePickerValue);
        this.updateDaysForYearMonth(year, month);
        const validDayIndex = Math.max(0, Math.min(dayIndex, this.days.length - 1));
        this.datePickerValue[2] = validDayIndex;
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:707", "日期索引处理详情:", {
          inputDay: day,
          calculatedDayIndex: dayIndex,
          daysArrayLength: this.days.length,
          validDayIndex,
          selectedDay: this.days[validDayIndex]
        });
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:715", "最终索引设置:", this.datePickerValue);
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:716", "选中日期:", {
          year: this.years[this.datePickerValue[0]],
          month: this.months[this.datePickerValue[1]],
          day: this.days[this.datePickerValue[2]],
          expectedDay: day
        });
        const actualSelectedDay = this.days[this.datePickerValue[2]];
        if (actualSelectedDay !== day) {
          common_vendor.index.__f__("error", "at pages/challenge/index.vue:726", "⚠️ 已选日期不匹配!");
          common_vendor.index.__f__("error", "at pages/challenge/index.vue:727", "期望:", day, "实际:", actualSelectedDay);
        }
      } else {
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:732", "设置默认日期为今天");
        this.setDefaultDate(currentYear, currentMonth, currentDay);
      }
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:736", "=== 日期选择器设置完成 ===");
    },
    // 设置默认日期（今天）
    setDefaultDate(year, month, day) {
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:741", "=== 设置默认日期 ===");
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:742", "输入参数:", { year, month, day });
      const yearIndex = this.years.indexOf(year);
      const monthIndex = month - 1;
      const dayIndex = day - 1;
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:748", "索引计算详情:", {
        yearIndex,
        monthIndex,
        dayIndex,
        yearInArray: this.years[yearIndex],
        monthInArray: this.months[monthIndex],
        expectedDay: day
      });
      this.datePickerValue = [
        Math.max(0, Math.min(yearIndex, this.years.length - 1)),
        Math.max(0, Math.min(monthIndex, this.months.length - 1)),
        0
        // 临时设置
      ];
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:764", "临时索引设置:", this.datePickerValue);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:765", "临时索引对应的值:", {
        year: this.years[this.datePickerValue[0]],
        month: this.months[this.datePickerValue[1]],
        day: "临时(0)"
      });
      this.updateDaysForYearMonth(year, month);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:774", "更新天数数组后:");
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:775", "- 天数数组长度:", this.days.length);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:776", "- 天数数组内容:", this.days);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:777", "- 期望的日期索引:", dayIndex);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:778", "- 期望的日期值:", day);
      const validDayIndex = Math.max(0, Math.min(dayIndex, this.days.length - 1));
      this.datePickerValue[2] = validDayIndex;
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:784", "最终日期索引设置:", validDayIndex);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:785", "最终索引:", this.datePickerValue);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:786", "最终选中日期:", {
        year: this.years[this.datePickerValue[0]],
        month: this.months[this.datePickerValue[1]],
        day: this.days[this.datePickerValue[2]],
        expectedDay: day
      });
      const actualDay = this.days[this.datePickerValue[2]];
      if (actualDay !== day) {
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:796", "⚠️ 日期不匹配!");
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:797", "期望:", day, "实际:", actualDay);
      }
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:800", "=== 默认日期设置完成 ===");
    },
    // 为指定年月更新天数数组
    updateDaysForYearMonth(year, month) {
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:805", "更新天数数组 for:", { year, month });
      const maxDays = new Date(year, month, 0).getDate();
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:808", "该月最大天数:", maxDays);
      this.days = [];
      for (let i = 1; i <= maxDays; i++) {
        this.days.push(i);
      }
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:815", "生成的天数数组:", this.days);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:816", "天数数组长度:", this.days.length);
    },
    // 验证日期有效性
    validateDate(dateString) {
      if (!dateString)
        return false;
      const date = new Date(dateString);
      if (isNaN(date.getTime()))
        return false;
      const parts = dateString.split("-");
      if (parts.length !== 3)
        return false;
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      if (year < this.years[0] || year > this.years[this.years.length - 1])
        return false;
      if (month < 1 || month > 12)
        return false;
      const maxDays = new Date(year, month, 0).getDate();
      if (day < 1 || day > maxDays)
        return false;
      return true;
    },
    // 更新天数（根据月份变化）- 用于日期选择器变化时
    updateDays(month) {
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:849", "=== updateDays 调用（用于选择器变化） ===");
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:850", "传入月份:", month);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:851", "当前datePickerValue:", this.datePickerValue);
      const selectedYear = this.years[this.datePickerValue[0]];
      const maxDays = new Date(selectedYear, month, 0).getDate();
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:857", "计算天数:", {
        selectedYear,
        month,
        maxDays
      });
      this.days = [];
      for (let i = 1; i <= maxDays; i++) {
        this.days.push(i);
      }
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:868", "生成的天数数组:", this.days);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:869", "天数数组长度:", this.days.length);
      if (this.datePickerValue[2] >= this.days.length) {
        const newIndex = this.days.length - 1;
        this.datePickerValue[2] = newIndex;
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:875", "调整天数索引到:", newIndex);
      }
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:878", "=== updateDays 完成 ===");
    },
    // 日期选择器变化
    onDateChange(e) {
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:883", "=== onDateChange 调用 ===");
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:884", "传入的值:", e.detail.value);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:885", "变化前的索引:", this.datePickerValue);
      const value = e.detail.value;
      const [yearIndex, monthIndex, dayIndex] = value;
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:890", "解析的索引:", { yearIndex, monthIndex, dayIndex });
      this.indexChangeLog.push({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        from: [...this.datePickerValue],
        to: [yearIndex, monthIndex, dayIndex],
        reason: "picker_change"
      });
      if (yearIndex < 0 || yearIndex >= this.years.length || monthIndex < 0 || monthIndex >= this.months.length) {
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:903", "索引超出范围，忽略变化");
        return;
      }
      if (this.datePickerValue[1] !== monthIndex) {
        common_vendor.index.__f__("log", "at pages/challenge/index.vue:909", "月份发生变化，需要更新天数数组");
        const selectedMonth = this.months[monthIndex];
        const selectedYear = this.years[yearIndex];
        this.updateDaysForYearMonth(selectedYear, selectedMonth);
        if (dayIndex >= this.days.length) {
          const adjustedDayIndex = this.days.length - 1;
          this.datePickerValue = [yearIndex, monthIndex, adjustedDayIndex];
          this.indexChangeLog.push({
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            from: [yearIndex, monthIndex, dayIndex],
            to: [yearIndex, monthIndex, adjustedDayIndex],
            reason: "day_overflow_adjust"
          });
          return;
        }
      }
      const validDayIndex = Math.max(0, Math.min(dayIndex, this.days.length - 1));
      if (validDayIndex !== dayIndex) {
        this.indexChangeLog.push({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          from: [yearIndex, monthIndex, dayIndex],
          to: [yearIndex, monthIndex, validDayIndex],
          reason: "day_index_adjust"
        });
      }
      this.datePickerValue = [yearIndex, monthIndex, validDayIndex];
    },
    // 确认选择日期
    confirmDate() {
      const yearIndex = Math.max(0, Math.min(this.datePickerValue[0], this.years.length - 1));
      const monthIndex = Math.max(0, Math.min(this.datePickerValue[1], this.months.length - 1));
      const dayIndex = Math.max(0, Math.min(this.datePickerValue[2], this.days.length - 1));
      this.datePickerValue = [yearIndex, monthIndex, dayIndex];
      const selectedYear = this.years[yearIndex];
      const selectedMonth = this.months[monthIndex];
      const selectedDay = this.days[dayIndex];
      const selectedDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:964", "生成的日期:", selectedDate);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:965", "日期选择器类型:", this.datePickerType);
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:966", "确认后的索引:", this.datePickerValue);
      if (!this.validateDate(selectedDate)) {
        common_vendor.index.showToast({
          title: "选择的日期无效",
          icon: "none"
        });
        return;
      }
      if (this.datePickerType === "startDate") {
        this.createForm.startDate = selectedDate;
      } else if (this.datePickerType === "endDate") {
        this.createForm.endDate = selectedDate;
      }
      this.hideDatePicker();
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:985", "=== 确认选择完成 ===");
    },
    // 隐藏日期选择器
    hideDatePicker() {
      this.showDatePicker = false;
    },
    // 打开群组选择器
    async openGroupPicker() {
      if (this.groups.length === 0) {
        await this.loadGroups();
        if (this.groups.length === 0) {
          common_vendor.index.showToast({
            title: "暂无可用群组",
            icon: "none"
          });
          return;
        }
      }
      this.selectedGroupIndex = this.groupIndex;
      this.showGroupPicker = true;
    },
    // radio-group选择变化
    onRadioGroupChange(e) {
      this.selectedGroupIndex = parseInt(e.detail.value);
    },
    // 选择群组（保留兼容性）
    selectGroup(index) {
      this.selectedGroupIndex = index;
    },
    // 确认群组选择
    confirmGroupSelection() {
      this.groupIndex = this.selectedGroupIndex;
      if (this.groupIndex >= 0 && this.groups[this.groupIndex]) {
        this.createForm.groupId = this.groups[this.groupIndex].id;
      } else {
        this.createForm.groupId = null;
      }
      this.hideGroupPicker();
    },
    // 隐藏群组选择器
    hideGroupPicker() {
      this.showGroupPicker = false;
    },
    // 群组选择（旧方法，保留兼容性）
    onGroupChange(e) {
      this.groupIndex = parseInt(e.detail.value);
      if (this.groupIndex >= 0) {
        this.createForm.groupId = this.groups[this.groupIndex].id;
      } else {
        this.createForm.groupId = null;
      }
    },
    // 选择图片
    chooseImage() {
      common_vendor.index.chooseImage({
        count: 1,
        sourceType: ["album", "camera"],
        success: async (res) => {
          try {
            common_vendor.index.showLoading({ title: "上传中..." });
            const uploadRes = await common_api.apiUploadAction(res.tempFilePaths[0]);
            common_vendor.index.hideLoading();
            let objectName = "";
            if (uploadRes && typeof uploadRes === "object") {
              if (uploadRes.data) {
                objectName = typeof uploadRes.data === "string" ? uploadRes.data : JSON.stringify(uploadRes.data);
              } else {
                objectName = JSON.stringify(uploadRes);
              }
            } else {
              objectName = uploadRes;
            }
            if (objectName) {
              const urlRes = await common_api.apiGetFileUrl({ objectName });
              this.createForm.coverImage = urlRes.data || urlRes || objectName;
            }
            common_vendor.index.showToast({
              title: "上传成功",
              icon: "success"
            });
          } catch (e) {
            common_vendor.index.hideLoading();
            common_vendor.index.__f__("error", "at pages/challenge/index.vue:1082", "上传失败:", e);
            common_vendor.index.showToast({
              title: "上传失败",
              icon: "none"
            });
          }
        }
      });
    },
    // 移除图片
    removeImage() {
      this.createForm.coverImage = "";
    },
    // 提交表单
    async submitForm() {
      if (!common_auth.requireLogin()) {
        common_vendor.index.showToast({
          title: "请先登录",
          icon: "none"
        });
        return;
      }
      if (!this.createForm.challengeName.trim()) {
        common_vendor.index.showToast({
          title: "请输入挑战名称",
          icon: "none"
        });
        return;
      }
      if (!this.createForm.startDate) {
        common_vendor.index.showToast({
          title: "请选择开始日期",
          icon: "none"
        });
        return;
      }
      if (!this.createForm.endDate) {
        common_vendor.index.showToast({
          title: "请选择结束日期",
          icon: "none"
        });
        return;
      }
      if (this.createForm.maxMembers <= 0) {
        common_vendor.index.showToast({
          title: "参与人数必须大于0",
          icon: "none"
        });
        return;
      }
      if (!this.createForm.trainRequire.trim()) {
        common_vendor.index.showToast({
          title: "请输入挑战要求",
          icon: "none"
        });
        return;
      }
      if (new Date(this.createForm.endDate) < new Date(this.createForm.startDate)) {
        common_vendor.index.showToast({
          title: "结束日期不能早于开始日期",
          icon: "none"
        });
        return;
      }
      if (this.createForm.challengeType === "group" && this.groupIndex < 0) {
        common_vendor.index.showToast({
          title: "请选择群组",
          icon: "none"
        });
        return;
      }
      if (this.createForm.challengeType === "group" && this.groupIndex >= 0 && this.groups[this.groupIndex]) {
        this.createForm.groupId = this.groups[this.groupIndex].id;
      } else if (this.createForm.challengeType === "public") {
        this.createForm.groupId = null;
      }
      common_vendor.index.__f__("log", "at pages/challenge/index.vue:1174", "提交表单数据:", {
        ...this.createForm,
        groups: this.groups,
        groupIndex: this.groupIndex
      });
      this.submitting = true;
      try {
        common_vendor.index.showLoading({ title: "创建中..." });
        let res;
        if (this.createForm.challengeType === "group") {
          const requestData = {
            name: this.createForm.challengeName,
            startDate: this.createForm.startDate,
            endDate: this.createForm.endDate,
            trainRequire: this.createForm.trainRequire,
            maxMembers: parseInt(this.createForm.maxMembers),
            coverImage: this.createForm.coverImage || null,
            groupId: this.createForm.groupId
          };
          res = await common_api.apiCreateGroupChallenge(requestData);
        } else {
          const requestData = {
            name: this.createForm.challengeName,
            startDate: this.createForm.startDate,
            endDate: this.createForm.endDate,
            trainRequire: this.createForm.trainRequire,
            maxMembers: parseInt(this.createForm.maxMembers),
            coverImage: this.createForm.coverImage || null
            // 不传递groupId，表示创建公开挑战
          };
          res = await common_api.apiChallengeCreate(requestData);
        }
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "创建成功",
          icon: "success"
        });
        this.hideCreateModal();
        this.resetForm();
        this.refreshData();
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:1227", "创建挑战失败:", e);
        common_vendor.index.showToast({
          title: e.errMsg || "创建失败，请重试",
          icon: "none"
        });
      } finally {
        this.submitting = false;
      }
    },
    // 刷新挑战状态
    async refreshChallengeStatus() {
      try {
        const res = await common_api.apiUpdateChallengeStatus();
        common_vendor.index.showToast({
          title: "状态已刷新",
          icon: "success"
        });
        this.refreshData();
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:1249", "刷新挑战状态失败:", e);
        common_vendor.index.showToast({
          title: "刷新失败",
          icon: "none"
        });
      }
    },
    // 底部导航方法
    goHome() {
      common_vendor.index.switchTab({
        url: "/pages/index/index"
      });
    },
    goTraining() {
      common_vendor.index.switchTab({
        url: "/pages/training/index"
      });
    },
    goChallenge() {
    },
    goGroup() {
      common_vendor.index.switchTab({
        url: "/pages/group/index"
      });
    },
    goUser() {
      common_vendor.index.switchTab({
        url: "/pages/user/profile"
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.showCreateModal && $options.showCreateModal(...args)),
    b: common_vendor.o([($event) => $data.searchKeyword = $event.detail.value, (...args) => $options.handleSearch && $options.handleSearch(...args)]),
    c: $data.searchKeyword,
    d: common_vendor.t($data.statusOptions[$data.statusIndex]),
    e: common_vendor.o((...args) => $options.onStatusChange && $options.onStatusChange(...args)),
    f: $data.statusIndex,
    g: $data.statusOptions,
    h: common_vendor.o((...args) => $options.refreshChallengeStatus && $options.refreshChallengeStatus(...args)),
    i: $data.loading && !$data.challenges.length
  }, $data.loading && !$data.challenges.length ? {} : !$data.challenges.length ? {} : common_vendor.e({
    k: common_vendor.f($data.challenges, (challenge, k0, i0) => {
      return common_vendor.e({
        a: challenge.coverImage
      }, challenge.coverImage ? {
        b: challenge.coverImage
      } : {}, {
        c: common_vendor.t(challenge.challengeName || challenge.title || challenge.name),
        d: common_vendor.t($options.getTypeText(challenge.type, challenge)),
        e: common_vendor.n($options.getTypeClass(challenge.type, challenge)),
        f: common_vendor.t($options.getStatusText(challenge.status, challenge)),
        g: common_vendor.n($options.getStatusClass(challenge.status, challenge)),
        h: challenge.startDate
      }, challenge.startDate ? {
        i: common_vendor.t($options.formatDate(challenge.startDate))
      } : {}, {
        j: challenge.endDate
      }, challenge.endDate ? {
        k: common_vendor.t($options.formatDate(challenge.endDate))
      } : {}, {
        l: challenge.maxMembers
      }, challenge.maxMembers ? {
        m: common_vendor.t(challenge.currentMembers || 0),
        n: common_vendor.t(challenge.maxMembers)
      } : {}, {
        o: challenge.trainRequire
      }, challenge.trainRequire ? {
        p: common_vendor.t(challenge.trainRequire.substring(0, 60)),
        q: common_vendor.t(challenge.trainRequire.length > 60 ? "..." : "")
      } : {}, {
        r: challenge.createdAt
      }, challenge.createdAt ? {
        s: common_vendor.t($options.formatDate(challenge.createdAt))
      } : {}, {
        t: challenge.id,
        v: common_vendor.o(($event) => $options.goToDetail(challenge.id), challenge.id)
      });
    }),
    l: $data.loadingMore
  }, $data.loadingMore ? {} : {}, {
    m: $data.noMoreData && $data.challenges.length > 0
  }, $data.noMoreData && $data.challenges.length > 0 ? {} : {}), {
    j: !$data.challenges.length,
    n: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    o: $data.showCreateModalFlag
  }, $data.showCreateModalFlag ? common_vendor.e({
    p: common_vendor.o((...args) => $options.hideCreateModal && $options.hideCreateModal(...args)),
    q: $data.createForm.challengeType === "public" ? 1 : "",
    r: $data.createForm.challengeType === "public" ? 1 : "",
    s: common_vendor.o(($event) => $options.selectChallengeType("public")),
    t: $data.createForm.challengeType === "group" ? 1 : "",
    v: $data.createForm.challengeType === "group" ? 1 : "",
    w: common_vendor.o(($event) => $options.selectChallengeType("group")),
    x: $data.createForm.challengeName,
    y: common_vendor.o(($event) => $data.createForm.challengeName = $event.detail.value),
    z: $data.createForm.startDate
  }, $data.createForm.startDate ? {
    A: common_vendor.t($data.createForm.startDate)
  } : {}, {
    B: common_vendor.o((...args) => $options.openStartDatePicker && $options.openStartDatePicker(...args)),
    C: $data.createForm.endDate
  }, $data.createForm.endDate ? {
    D: common_vendor.t($data.createForm.endDate)
  } : {}, {
    E: common_vendor.o((...args) => $options.openEndDatePicker && $options.openEndDatePicker(...args)),
    F: $data.createForm.maxMembers,
    G: common_vendor.o(($event) => $data.createForm.maxMembers = $event.detail.value),
    H: $data.createForm.trainRequire,
    I: common_vendor.o(($event) => $data.createForm.trainRequire = $event.detail.value),
    J: !$data.createForm.coverImage
  }, !$data.createForm.coverImage ? {} : {
    K: $data.createForm.coverImage,
    L: common_vendor.o((...args) => $options.removeImage && $options.removeImage(...args))
  }, {
    M: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args)),
    N: $data.createForm.challengeType === "group"
  }, $data.createForm.challengeType === "group" ? common_vendor.e({
    O: $data.groupIndex >= 0
  }, $data.groupIndex >= 0 ? {
    P: common_vendor.t((_a = $data.groups[$data.groupIndex]) == null ? void 0 : _a.groupName)
  } : {}, {
    Q: common_vendor.o((...args) => $options.openGroupPicker && $options.openGroupPicker(...args))
  }) : {}, {
    R: !$data.submitting
  }, !$data.submitting ? {} : {}, {
    S: $data.submitting ? 1 : "",
    T: $data.submitting,
    U: common_vendor.o((...args) => $options.submitForm && $options.submitForm(...args)),
    V: common_vendor.o(() => {
    }),
    W: common_vendor.o((...args) => $options.hideCreateModal && $options.hideCreateModal(...args))
  }) : {}, {
    X: $data.showDatePicker
  }, $data.showDatePicker ? {
    Y: common_vendor.o((...args) => $options.hideDatePicker && $options.hideDatePicker(...args)),
    Z: common_vendor.o((...args) => $options.confirmDate && $options.confirmDate(...args)),
    aa: common_vendor.f($data.years, (year, index, i0) => {
      return {
        a: common_vendor.t(year),
        b: index
      };
    }),
    ab: common_vendor.f($data.months, (month, index, i0) => {
      return {
        a: common_vendor.t(month),
        b: index
      };
    }),
    ac: common_vendor.f($data.days, (day, index, i0) => {
      return {
        a: common_vendor.t(day),
        b: index
      };
    }),
    ad: $data.datePickerValue,
    ae: common_vendor.o((...args) => $options.onDateChange && $options.onDateChange(...args)),
    af: common_vendor.o(() => {
    }),
    ag: common_vendor.o((...args) => $options.hideDatePicker && $options.hideDatePicker(...args))
  } : {}, {
    ah: $data.showGroupPicker
  }, $data.showGroupPicker ? {
    ai: common_vendor.o((...args) => $options.hideGroupPicker && $options.hideGroupPicker(...args)),
    aj: common_vendor.o((...args) => $options.confirmGroupSelection && $options.confirmGroupSelection(...args)),
    ak: common_vendor.f($data.groups, (group, index, i0) => {
      return {
        a: index,
        b: $data.selectedGroupIndex === index,
        c: common_vendor.t(group.groupName),
        d: group.id || index
      };
    }),
    al: common_vendor.o((...args) => $options.onRadioGroupChange && $options.onRadioGroupChange(...args)),
    am: common_vendor.o(() => {
    }),
    an: common_vendor.o((...args) => $options.hideGroupPicker && $options.hideGroupPicker(...args))
  } : {}, {
    ao: $data.showCreateModalFlag ? 9999 : "auto"
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-93d7d659"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/challenge/index.js.map
