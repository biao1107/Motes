"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const _sfc_main = {
  data() {
    return {
      courseId: null,
      course: {},
      courseContent: [],
      videoError: false
    };
  },
  computed: {
    // 将中文难度映射为英文class名称
    difficultyClass() {
      const difficultyMap = {
        "入门": "diff-beginner",
        "初级": "diff-elementary",
        "中级": "diff-intermediate",
        "高级": "diff-advanced"
      };
      return difficultyMap[this.course.difficulty] || "diff-beginner";
    }
  },
  onLoad(options) {
    this.courseId = options.id;
    this.loadCourseDetail();
  },
  methods: {
    // 加载课程详情
    async loadCourseDetail() {
      if (!this.courseId)
        return;
      try {
        const res = await common_api.apiGetCourseById(this.courseId);
        this.course = res || {};
        if (this.course.content) {
          try {
            this.courseContent = JSON.parse(this.course.content);
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/course/detail.vue:149", "解析课程内容失败:", e);
            this.courseContent = [];
          }
        }
        common_vendor.index.setNavigationBarTitle({
          title: this.course.courseName || "课程详情"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/course/detail.vue:160", "加载课程详情失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 1500);
      }
    },
    // 添加收藏
    addToFavorites() {
      common_vendor.index.showToast({
        title: "已收藏",
        icon: "success"
      });
    },
    // 视频加载错误处理
    onVideoError(e) {
      common_vendor.index.__f__("error", "at pages/course/detail.vue:184", "视频加载失败:", e);
      this.videoError = true;
    },
    // 重新加载视频
    retryVideoLoad() {
      this.videoError = false;
      this.loadCourseDetail();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.course.coverImage
  }, $data.course.coverImage ? {
    b: $data.course.coverImage
  } : {}, {
    c: common_vendor.t($data.course.courseName),
    d: common_vendor.t($data.course.description),
    e: common_vendor.t($data.course.duration),
    f: common_vendor.t($data.course.calories || 0),
    g: common_vendor.t($data.course.courseType),
    h: common_vendor.t($data.course.difficulty),
    i: common_vendor.n($options.difficultyClass),
    j: common_vendor.f($data.courseContent, (item, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(index + 1),
        b: common_vendor.t(item.action),
        c: item.time
      }, item.time ? {
        d: common_vendor.t(item.time)
      } : {}, {
        e: item.sets
      }, item.sets ? {
        f: common_vendor.t(item.sets)
      } : {}, {
        g: item.count
      }, item.count ? {
        h: common_vendor.t(item.count)
      } : {}, {
        i: item.rest
      }, item.rest ? {
        j: common_vendor.t(item.rest)
      } : {}, {
        k: index
      });
    }),
    k: $data.course.videoUrl
  }, $data.course.videoUrl ? {
    l: $data.course.videoUrl,
    m: $data.course.coverImage,
    n: common_vendor.o((...args) => $options.onVideoError && $options.onVideoError(...args))
  } : {}, {
    o: $data.videoError
  }, $data.videoError ? {
    p: common_vendor.o((...args) => $options.retryVideoLoad && $options.retryVideoLoad(...args))
  } : {}, {
    q: common_vendor.o((...args) => $options.addToFavorites && $options.addToFavorites(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-3d21314d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/course/detail.js.map
