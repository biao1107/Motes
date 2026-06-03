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
    difficultyClass() {
      const difficultyMap = {
        入门: "diff-beginner",
        初级: "diff-elementary",
        中级: "diff-intermediate",
        高级: "diff-advanced"
      };
      return difficultyMap[this.course.difficulty] || "diff-beginner";
    }
  },
  onLoad(options) {
    this.courseId = options.id;
    this.loadCourseDetail();
  },
  methods: {
    async loadCourseDetail() {
      if (!this.courseId)
        return;
      try {
        const res = await common_api.apiGetCourseById(this.courseId);
        this.course = res || {};
        if (this.course.content) {
          try {
            this.courseContent = JSON.parse(this.course.content);
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/course/detail.vue:141", "解析课程内容失败:", error);
            this.courseContent = [];
          }
        }
        common_vendor.index.setNavigationBarTitle({
          title: this.course.courseName || "课程详情"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/course/detail.vue:150", "加载课程详情失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 1500);
      }
    },
    addToFavorites() {
      common_vendor.index.showToast({
        title: "已收藏",
        icon: "success"
      });
    },
    onVideoError(error) {
      common_vendor.index.__f__("error", "at pages/course/detail.vue:167", "视频加载失败:", error);
      this.videoError = true;
    },
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
    c: common_vendor.t($data.course.courseName || "课程详情"),
    d: common_vendor.t($data.course.description || "查看课程结构、训练时长和视频内容。"),
    e: common_vendor.t($data.course.duration || 0),
    f: common_vendor.t($data.course.calories || 0),
    g: common_vendor.t($data.course.courseType || "未分类"),
    h: common_vendor.t($data.course.difficulty || "入门"),
    i: common_vendor.n($options.difficultyClass),
    j: $data.courseContent.length > 0
  }, $data.courseContent.length > 0 ? {
    k: common_vendor.f($data.courseContent, (item, index, i0) => {
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
    })
  } : {}, {
    l: $data.course.videoUrl && !$data.videoError
  }, $data.course.videoUrl && !$data.videoError ? {
    m: $data.course.videoUrl,
    n: $data.course.coverImage,
    o: common_vendor.o((...args) => $options.onVideoError && $options.onVideoError(...args))
  } : {}, {
    p: $data.videoError
  }, $data.videoError ? {
    q: common_vendor.o((...args) => $options.retryVideoLoad && $options.retryVideoLoad(...args))
  } : {}, {
    r: common_vendor.o((...args) => $options.addToFavorites && $options.addToFavorites(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-3d21314d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/course/detail.js.map
