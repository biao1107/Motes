"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  data() {
    return {
      loading: false,
      trainRecords: [],
      groups: [],
      todayDate: ""
    };
  },
  computed: {
    totalCompleted() {
      return this.trainRecords.reduce((sum, record) => {
        return sum + (record.completeCount || 0);
      }, 0);
    },
    completedCount() {
      return this.trainRecords.filter((record) => record.status === 1).length;
    }
  },
  onLoad() {
    this.setTodayDate();
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.loadTodayTraining();
    this.loadGroups();
  },
  methods: {
    setTodayDate() {
      const now = /* @__PURE__ */ new Date();
      this.todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    },
    async loadTodayTraining() {
      this.loading = true;
      try {
        const res = await common_api.apiGetTodayTraining();
        this.trainRecords = res.data || res || [];
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/training/today.vue:126", "加载训练记录失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
      }
    },
    async loadGroups() {
      try {
        const res = await common_api.apiMyGroups();
        this.groups = res.data || res || [];
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/training/today.vue:141", "加载群组失败:", error);
      }
    },
    getGroupName(groupId) {
      const group = this.groups.find((g) => g.id === groupId);
      return group ? group.groupName : `群组 ${groupId}`;
    },
    getStatusText(status) {
      const statusMap = {
        0: "未完成",
        1: "已完成",
        2: "已放弃"
      };
      return statusMap[status] || "未知";
    },
    formatDate(dateStr) {
      if (!dateStr)
        return "-";
      try {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      } catch (e) {
        return dateStr;
      }
    },
    formatDateTime(dateTimeStr) {
      if (!dateTimeStr)
        return "-";
      try {
        const date = new Date(dateTimeStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      } catch (e) {
        return dateTimeStr;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.todayDate),
    b: $data.loading
  }, $data.loading ? {} : $data.trainRecords.length === 0 ? {} : {
    d: common_vendor.f($data.trainRecords, (record, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.getGroupName(record.groupId)),
        b: common_vendor.t($options.getStatusText(record.status)),
        c: common_vendor.n("status-" + record.status),
        d: common_vendor.t($options.formatDate(record.trainDate)),
        e: common_vendor.t(record.completeCount || 0),
        f: record.score
      }, record.score ? {
        g: common_vendor.t(record.score)
      } : {}, {
        h: common_vendor.t($options.formatDateTime(record.createTime)),
        i: record.id
      });
    })
  }, {
    c: $data.trainRecords.length === 0,
    e: $data.trainRecords.length > 0
  }, $data.trainRecords.length > 0 ? {
    f: common_vendor.t($data.trainRecords.length),
    g: common_vendor.t($options.totalCompleted),
    h: common_vendor.t($options.completedCount)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-6d5b6066"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/training/today.js.map
