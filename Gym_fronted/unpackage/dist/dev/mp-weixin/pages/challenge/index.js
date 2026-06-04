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
      statusIndex: 0,
      statusOptions: ["全部状态", "未开始", "进行中", "已结束"],
      hasMore: true,
      showCreateModalFlag: false,
      submitting: false,
      minDate: "",
      groups: [],
      groupIndex: -1,
      createForm: {
        challengeType: "public",
        challengeName: "",
        startDate: "",
        endDate: "",
        maxMembers: 10,
        trainRequire: "",
        coverImage: "",
        groupId: null
      },
      showDatePicker: false,
      datePickerType: "",
      datePickerValue: [0, 0, 0],
      years: [],
      months: [],
      days: [],
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
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:378", "加载挑战列表失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
        this.loadingMore = false;
      }
    },
    refreshData() {
      this.page = 1;
      this.noMoreData = false;
      this.loadData();
    },
    loadMore() {
      if (this.loadingMore || this.noMoreData)
        return;
      common_vendor.index.showToast({
        title: "已加载全部数据",
        icon: "none"
      });
    },
    handleSearch(e) {
      this.searchKeyword = e.detail.value;
      this.debounceSearch();
    },
    debounceSearch() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.page = 1;
        this.noMoreData = false;
        this.loadData();
      }, 500);
    },
    onStatusChange(e) {
      this.statusIndex = parseInt(e.detail.value);
      this.statusFilter = this.statusIndex > 0 ? this.statusIndex - 1 : null;
      this.page = 1;
      this.noMoreData = false;
      this.loadData();
    },
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
    getTypeText(type, challenge) {
      const isGroupChallenge = challenge && challenge.groupId && challenge.groupId > 0;
      return isGroupChallenge ? "组内挑战" : "公开挑战";
    },
    getTypeClass(type, challenge) {
      const isGroupChallenge = challenge && challenge.groupId && challenge.groupId > 0;
      return isGroupChallenge ? "type-group" : "type-public";
    },
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
    calculateChallengeStatus(challenge) {
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(challenge.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(challenge.endDate);
      endDate.setHours(0, 0, 0, 0);
      if (today < startDate) {
        return 0;
      }
      if (today >= startDate && today <= endDate) {
        return 1;
      }
      return 2;
    },
    formatDate(dateStr) {
      if (!dateStr)
        return "";
      try {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
          date.getDate()
        ).padStart(2, "0")}`;
      } catch (error) {
        return dateStr;
      }
    },
    getBriefText(text) {
      if (!text)
        return "";
      return text.length > 60 ? `${text.substring(0, 60)}...` : text;
    },
    goToDetail(challengeId) {
      common_vendor.index.navigateTo({
        url: `/pages/challenge/detail?id=${challengeId}`
      });
    },
    async selectChallengeType(type) {
      this.createForm.challengeType = type;
      if (type === "group" && this.groupIndex === -1) {
        await this.loadGroups();
      } else if (type === "public") {
        this.groupIndex = -1;
        this.createForm.groupId = null;
      }
    },
    async showCreateModal() {
      if (!common_auth.requireLogin()) {
        common_vendor.index.showToast({
          title: "请先登录",
          icon: "none"
        });
        return;
      }
      const today = /* @__PURE__ */ new Date();
      this.minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate()
      ).padStart(2, "0")}`;
      this.resetForm();
      await this.loadGroups();
      this.showCreateModalFlag = true;
    },
    hideCreateModal() {
      this.showCreateModalFlag = false;
    },
    async loadGroups() {
      try {
        const res = await common_api.apiMyGroups();
        if (res == null ? void 0 : res.data) {
          this.groups = Array.isArray(res.data) ? res.data : res || [];
        } else {
          this.groups = res || [];
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:536", "加载群组列表失败:", error);
        common_vendor.index.showToast({
          title: "加载群组失败",
          icon: "none"
        });
      }
    },
    resetForm() {
      this.createForm = {
        challengeType: "public",
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
    openStartDatePicker() {
      this.datePickerType = "startDate";
      this.setupDatePicker(this.createForm.startDate);
      this.showDatePicker = true;
    },
    openEndDatePicker() {
      this.datePickerType = "endDate";
      this.setupDatePicker(this.createForm.endDate);
      this.showDatePicker = true;
    },
    setupDatePicker(selectedDate) {
      const now = /* @__PURE__ */ new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      now.getDate();
      this.years = [];
      for (let year = currentYear; year <= currentYear + 5; year += 1) {
        this.years.push(year);
      }
      this.months = Array.from({ length: 12 }, (_, index) => index + 1);
      this.days = this.getDaysInMonth(currentYear, currentMonth);
      let targetDate = selectedDate ? new Date(selectedDate) : /* @__PURE__ */ new Date();
      if (Number.isNaN(targetDate.getTime())) {
        targetDate = /* @__PURE__ */ new Date();
      }
      const yearIndex = Math.max(0, this.years.indexOf(targetDate.getFullYear()));
      const monthIndex = Math.max(0, targetDate.getMonth());
      const dayIndex = Math.max(0, targetDate.getDate() - 1);
      this.updateDaysByYearMonth(yearIndex, monthIndex, dayIndex);
    },
    getDaysInMonth(year, month) {
      const daysCount = new Date(year, month, 0).getDate();
      return Array.from({ length: daysCount }, (_, index) => index + 1);
    },
    updateDaysByYearMonth(yearIndex, monthIndex, dayIndex = 0) {
      const selectedYear = this.years[yearIndex];
      const selectedMonth = this.months[monthIndex];
      this.days = this.getDaysInMonth(selectedYear, selectedMonth);
      const validDayIndex = Math.max(0, Math.min(dayIndex, this.days.length - 1));
      this.datePickerValue = [yearIndex, monthIndex, validDayIndex];
    },
    onDateChange(e) {
      const [yearIndex, monthIndex, dayIndex] = e.detail.value;
      this.updateDaysByYearMonth(yearIndex, monthIndex, dayIndex);
    },
    validateDate(dateStr) {
      const date = new Date(dateStr);
      return !Number.isNaN(date.getTime());
    },
    confirmDate() {
      const yearIndex = Math.max(0, Math.min(this.datePickerValue[0], this.years.length - 1));
      const monthIndex = Math.max(0, Math.min(this.datePickerValue[1], this.months.length - 1));
      const dayIndex = Math.max(0, Math.min(this.datePickerValue[2], this.days.length - 1));
      const selectedYear = this.years[yearIndex];
      const selectedMonth = this.months[monthIndex];
      const selectedDay = this.days[dayIndex];
      const selectedDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
        selectedDay
      ).padStart(2, "0")}`;
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
    },
    hideDatePicker() {
      this.showDatePicker = false;
    },
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
    onRadioGroupChange(e) {
      this.selectedGroupIndex = parseInt(e.detail.value);
    },
    confirmGroupSelection() {
      this.groupIndex = this.selectedGroupIndex;
      if (this.groupIndex >= 0 && this.groups[this.groupIndex]) {
        this.createForm.groupId = this.groups[this.groupIndex].id;
      } else {
        this.createForm.groupId = null;
      }
      this.hideGroupPicker();
    },
    hideGroupPicker() {
      this.showGroupPicker = false;
    },
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
          } catch (error) {
            common_vendor.index.hideLoading();
            common_vendor.index.__f__("error", "at pages/challenge/index.vue:706", "上传失败:", error);
            common_vendor.index.showToast({
              title: "上传失败",
              icon: "none"
            });
          }
        }
      });
    },
    removeImage() {
      this.createForm.coverImage = "";
    },
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
          title: "参与人数必须大于 0",
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
      this.submitting = true;
      try {
        common_vendor.index.showLoading({ title: "创建中..." });
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
          await common_api.apiCreateGroupChallenge(requestData);
        } else {
          const requestData = {
            name: this.createForm.challengeName,
            startDate: this.createForm.startDate,
            endDate: this.createForm.endDate,
            trainRequire: this.createForm.trainRequire,
            maxMembers: parseInt(this.createForm.maxMembers),
            coverImage: this.createForm.coverImage || null
          };
          await common_api.apiChallengeCreate(requestData);
        }
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "创建成功",
          icon: "success"
        });
        this.hideCreateModal();
        this.resetForm();
        this.refreshData();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:828", "创建挑战失败:", error);
        common_vendor.index.showToast({
          title: error.errMsg || "创建失败，请稍后重试",
          icon: "none"
        });
      } finally {
        this.submitting = false;
      }
    },
    async refreshChallengeStatus() {
      try {
        await common_api.apiUpdateChallengeStatus();
        common_vendor.index.showToast({
          title: "状态已刷新",
          icon: "success"
        });
        this.refreshData();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/challenge/index.vue:846", "刷新挑战状态失败:", error);
        common_vendor.index.showToast({
          title: "刷新失败",
          icon: "none"
        });
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.showCreateModal && $options.showCreateModal(...args)),
    b: common_vendor.t($data.challenges.length),
    c: common_vendor.t($data.statusOptions[$data.statusIndex]),
    d: common_vendor.o([($event) => $data.searchKeyword = $event.detail.value, (...args) => $options.handleSearch && $options.handleSearch(...args)]),
    e: $data.searchKeyword,
    f: common_vendor.t($data.statusOptions[$data.statusIndex]),
    g: common_vendor.o((...args) => $options.onStatusChange && $options.onStatusChange(...args)),
    h: $data.statusIndex,
    i: $data.statusOptions,
    j: common_vendor.o((...args) => $options.refreshChallengeStatus && $options.refreshChallengeStatus(...args)),
    k: $data.loading && !$data.challenges.length
  }, $data.loading && !$data.challenges.length ? {} : !$data.challenges.length ? {
    m: common_vendor.o((...args) => $options.showCreateModal && $options.showCreateModal(...args))
  } : common_vendor.e({
    n: common_vendor.t($data.challenges.length),
    o: common_vendor.f($data.challenges, (challenge, k0, i0) => {
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
        p: common_vendor.t($options.getBriefText(challenge.trainRequire))
      } : {}, {
        q: challenge.createdAt
      }, challenge.createdAt ? {
        r: common_vendor.t($options.formatDate(challenge.createdAt))
      } : {}, {
        s: challenge.id,
        t: common_vendor.o(($event) => $options.goToDetail(challenge.id), challenge.id)
      });
    }),
    p: $data.loadingMore
  }, $data.loadingMore ? {} : {}, {
    q: $data.noMoreData && $data.challenges.length > 0
  }, $data.noMoreData && $data.challenges.length > 0 ? {} : {}), {
    l: !$data.challenges.length,
    r: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    s: $data.showCreateModalFlag
  }, $data.showCreateModalFlag ? common_vendor.e({
    t: common_vendor.o((...args) => $options.hideCreateModal && $options.hideCreateModal(...args)),
    v: $data.createForm.challengeType === "public" ? 1 : "",
    w: common_vendor.o(($event) => $options.selectChallengeType("public")),
    x: $data.createForm.challengeType === "group" ? 1 : "",
    y: common_vendor.o(($event) => $options.selectChallengeType("group")),
    z: $data.createForm.challengeName,
    A: common_vendor.o(($event) => $data.createForm.challengeName = $event.detail.value),
    B: common_vendor.t($data.createForm.startDate || "请选择开始日期"),
    C: !$data.createForm.startDate ? 1 : "",
    D: common_vendor.o((...args) => $options.openStartDatePicker && $options.openStartDatePicker(...args)),
    E: common_vendor.t($data.createForm.endDate || "请选择结束日期"),
    F: !$data.createForm.endDate ? 1 : "",
    G: common_vendor.o((...args) => $options.openEndDatePicker && $options.openEndDatePicker(...args)),
    H: $data.createForm.maxMembers,
    I: common_vendor.o(($event) => $data.createForm.maxMembers = $event.detail.value),
    J: $data.createForm.trainRequire,
    K: common_vendor.o(($event) => $data.createForm.trainRequire = $event.detail.value),
    L: !$data.createForm.coverImage
  }, !$data.createForm.coverImage ? {} : {
    M: $data.createForm.coverImage,
    N: common_vendor.o((...args) => $options.removeImage && $options.removeImage(...args))
  }, {
    O: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args)),
    P: $data.createForm.challengeType === "group"
  }, $data.createForm.challengeType === "group" ? {
    Q: common_vendor.t($data.groupIndex >= 0 ? (_a = $data.groups[$data.groupIndex]) == null ? void 0 : _a.groupName : "请选择群组"),
    R: $data.groupIndex < 0 ? 1 : "",
    S: common_vendor.o((...args) => $options.openGroupPicker && $options.openGroupPicker(...args))
  } : {}, {
    T: common_vendor.o((...args) => $options.hideCreateModal && $options.hideCreateModal(...args)),
    U: common_vendor.t($data.submitting ? "提交中..." : "创建挑战"),
    V: $data.submitting ? 1 : "",
    W: common_vendor.o((...args) => $options.submitForm && $options.submitForm(...args)),
    X: common_vendor.o(() => {
    }),
    Y: common_vendor.o((...args) => $options.hideCreateModal && $options.hideCreateModal(...args))
  }) : {}, {
    Z: $data.showDatePicker
  }, $data.showDatePicker ? {
    aa: common_vendor.o((...args) => $options.hideDatePicker && $options.hideDatePicker(...args)),
    ab: common_vendor.o((...args) => $options.confirmDate && $options.confirmDate(...args)),
    ac: common_vendor.f($data.years, (year, index, i0) => {
      return {
        a: common_vendor.t(year),
        b: index
      };
    }),
    ad: common_vendor.f($data.months, (month, index, i0) => {
      return {
        a: common_vendor.t(month),
        b: index
      };
    }),
    ae: common_vendor.f($data.days, (day, index, i0) => {
      return {
        a: common_vendor.t(day),
        b: index
      };
    }),
    af: $data.datePickerValue,
    ag: common_vendor.o((...args) => $options.onDateChange && $options.onDateChange(...args)),
    ah: common_vendor.o(() => {
    }),
    ai: common_vendor.o((...args) => $options.hideDatePicker && $options.hideDatePicker(...args))
  } : {}, {
    aj: $data.showGroupPicker
  }, $data.showGroupPicker ? {
    ak: common_vendor.o((...args) => $options.hideGroupPicker && $options.hideGroupPicker(...args)),
    al: common_vendor.o((...args) => $options.confirmGroupSelection && $options.confirmGroupSelection(...args)),
    am: common_vendor.f($data.groups, (group, index, i0) => {
      return {
        a: index,
        b: $data.selectedGroupIndex === index,
        c: common_vendor.t(group.groupName),
        d: group.id || index
      };
    }),
    an: common_vendor.o((...args) => $options.onRadioGroupChange && $options.onRadioGroupChange(...args)),
    ao: common_vendor.o(() => {
    }),
    ap: common_vendor.o((...args) => $options.hideGroupPicker && $options.hideGroupPicker(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-93d7d659"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/challenge/index.js.map
